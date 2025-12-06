
        // --- Sesión ---
        const logoutBtn = document.getElementById('logoutBtn');
        if (!sessionStorage.getItem('loggedIn')) {
            window.location.href = 'index.html';
        }
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function () {
                sessionStorage.removeItem('loggedIn');
                window.location.href = 'index.html';
            });
        }

        // --- MiniTrello logic ---
        const STORAGE_KEY = 'minitrello_tasks_v1';
        const STORAGE_COLS = 'minitrello_cols_v1';
        const STORAGE_LAST_STATUS = 'minitrello_last_status_v1';
        let tasks = [];
        let columns = [];

        const input = document.getElementById('taskInput');
        const addBtn = document.getElementById('addBtn');
        const addColumnBtn = document.getElementById('addColumnBtn');
        const resetBtn = document.getElementById('resetBtn');
        const board = document.getElementById('board');
        let lists = {};
        let counters = {};
        let isDraggingTask = false;
        // Usuario actual desde la sesión (ajusta la clave si fuera distinta)
        const currentUser = (sessionStorage.getItem('user') || sessionStorage.getItem('username') || '').toLowerCase();
        const currentPass = (sessionStorage.getItem('pass') || sessionStorage.getItem('password') || '').toLowerCase();
        const isDeleteBlocked = currentUser === 'ortega' && currentPass === 'ortega123';

        function loadTasks(){
            try{
                const raw = localStorage.getItem(STORAGE_KEY);
                tasks = raw ? JSON.parse(raw) : [];
            }catch(e){
                tasks = [];
            }
        }
        function saveTasks(){
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        }

        function loadColumns(){
            try{
                const raw = localStorage.getItem(STORAGE_COLS);
                columns = raw ? JSON.parse(raw) : [
                    { key:'pendiente', name:'Pendiente' },
                    { key:'enproceso', name:'En proceso' },
                    { key:'completo', name:'Completo' }
                ];
            }catch(e){
                columns = [
                    { key:'pendiente', name:'Pendiente' },
                    { key:'enproceso', name:'En proceso' },
                    { key:'completo', name:'Completo' }
                ];
            }
        }
        function saveColumns(){
            localStorage.setItem(STORAGE_COLS, JSON.stringify(columns));
        }

        function getDefaultColumns(){
            return [
                { key:'pendiente', name:'Pendiente' },
                { key:'enproceso', name:'En proceso' },
                { key:'completo', name:'Completo' }
            ];
        }

        function resetData(){
            tasks = [];
            columns = getDefaultColumns();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
            localStorage.setItem(STORAGE_COLS, JSON.stringify(columns));
            localStorage.removeItem(STORAGE_LAST_STATUS);
            render();
        }

        function normKey(name){
            return name.toLowerCase().trim()
                .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
                .replace(/[^a-z0-9]+/g,'') || 'col_' + Math.random().toString(36).slice(2,6);
        }

        function createCard(task){
            const el = document.createElement('div');
            el.className = 'task';
            // Restringir el arrastre: solo desde el handle ☰
            el.draggable = false;
            el.dataset.id = task.id;

            el.innerHTML = `
                <div class="title">${escapeHtml(task.title)}</div>
                <div class="submeta">
                    ${task.assignee ? `<span class="chip">👤 ${escapeHtml(task.assignee)}</span>` : ''}
                    ${(task.startDate || task.endDate) ? `<span class="chip">📅 ${escapeHtml(task.startDate || '')}${task.endDate ? ' → ' + escapeHtml(task.endDate) : ''}</span>` : ''}
                </div>
                <div class="meta">
                    <span class="task-drag" title="Mover">☰</span>
                    <button class="view" title="Ver comentarios">💬</button>
                    <button class="edit" title="Editar">✏️</button>
                    <button class="del" title="Eliminar">🗑️</button>
                </div>
            `;

            const handle = el.querySelector('.task-drag');
            if (handle){
                // Hacer draggable solo el handle
                handle.setAttribute('draggable','true');
                handle.addEventListener('mousedown', () => { el.setAttribute('data-dragging','true'); });
                handle.addEventListener('dragstart', e => {
                    // Permitir solo un arrastre de tarea a la vez
                    if (isDraggingTask){
                        e.preventDefault();
                        return;
                    }
                    isDraggingTask = true;
                    if (!task.id) {
                        task.id = 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
                        el.dataset.id = task.id;
                        saveTasks();
                    }
                    if (e.dataTransfer) {
                        e.dataTransfer.setData('text/plain', task.id);
                        e.dataTransfer.effectAllowed = 'move';
                    }
                    el.classList.add('dragging');
                    // Deshabilitar arrastre en otras tareas temporalmente (sus handles)
                    document.querySelectorAll('.task').forEach(node => {
                        if (node !== el){
                            const h = node.querySelector('.task-drag');
                            if (h) h.setAttribute('draggable','false');
                        }
                    });
                });
                handle.addEventListener('dragend', () => {
                    el.classList.remove('dragging');
                    el.removeAttribute('data-dragging');
                    isDraggingTask = false;
                    // Rehabilitar arrastre en todas las tareas (sus handles)
                    document.querySelectorAll('.task .task-drag').forEach(h => {
                        h.setAttribute('draggable','true');
                    });
                });
            }

            el.querySelector('.view').addEventListener('click', () => {
                openCommentModal(task);
            });

            el.querySelector('.edit').addEventListener('click', () => {
                openModal(task);
            });

            const delBtn = el.querySelector('.del');
            if (isDeleteBlocked){
                // Ocultar botón eliminar tarea para el usuario bloqueado
                delBtn.style.display = 'none';
            } else {
                delBtn.addEventListener('click', () => {
                    // Abrir modal de confirmación para eliminar la tarea
                    openTaskDeleteModal(task);
                });
            }

            return el;
        }

        function render(){
            // Build columns DOM
            board.innerHTML = '';
            lists = {};
            counters = {};

            columns.forEach((col, index) => {
                const columnEl = document.createElement('div');
                columnEl.className = 'column';
                columnEl.draggable = true; // enable column drag for reordering
                columnEl.dataset.status = col.key;
                columnEl.dataset.index = index;

                const header = document.createElement('div');
                header.className = 'col-header';
                header.innerHTML = `
                    <div class="col-title">
                        <span class="col-tag ${col.key}"></span>
                        ${escapeHtml(col.name)}
                    </div>
                    <div class="col-actions">
                        <button class="col-rename" title="Renombrar">✏️</button>
                        <button class="col-delete" title="Eliminar">🗑️</button>
                        <span class="col-drag" title="Mover">☰</span>
                        <div class="count" id="count-${col.key}">0</div>
                    </div>
                `;

                const listEl = document.createElement('div');
                listEl.className = 'task-list';
                listEl.id = `list-${col.key}`;

                columnEl.appendChild(header);
                columnEl.appendChild(listEl);
                board.appendChild(columnEl);

                lists[col.key] = listEl;
                counters[col.key] = header.querySelector(`#count-${col.key}`);
                // Ocultar botón de eliminar columna si el usuario tiene bloqueo
                if (isDeleteBlocked){
                    const delColBtn = header.querySelector('.col-delete');
                    if (delColBtn){
                        delColBtn.style.display = 'none';
                    }
                }
            });

            // Group and render tasks
            const groupedCounts = {};
            columns.forEach(c => groupedCounts[c.key] = 0);

            tasks.forEach(t => {
                const status = t.status || columns[0]?.key || 'pendiente';
                const card = createCard(t);
                if (!lists[status]) {
                    // If task has status for a removed column, send to first column
                    t.status = columns[0]?.key || status;
                }
                (lists[t.status] || lists[columns[0]?.key])?.appendChild(card);
                if (groupedCounts[t.status] !== undefined) groupedCounts[t.status]++;
            });

            Object.keys(counters).forEach(k => {
                const count = groupedCounts[k] || 0;
                counters[k].textContent = count;
                if (lists[k].children.length === 0) {
                    const empty = document.createElement('div');
                    empty.className = 'empty';
                    empty.textContent = 'Sin tareas';
                    lists[k].appendChild(empty);
                }
            });

            // DnD per column
            document.querySelectorAll('.column').forEach(col => {
                col.addEventListener('dragover', e => {
                    e.preventDefault();
                    if (e.dataTransfer) {
                        e.dataTransfer.dropEffect = 'move';
                    }
                    col.classList.add('dragover');
                });
                col.addEventListener('dragleave', () => { col.classList.remove('dragover'); });
                col.addEventListener('drop', e => {
                    e.preventDefault();
                    col.classList.remove('dragover');
                    const id = e.dataTransfer.getData('text/plain');
                    const status = col.dataset.status;
                    // differentiate task vs column drag by prefix
                    if (id && id.startsWith('col_')){
                        const fromIdx = Number(id.replace('col_',''));
                        const toIdx = Number(col.dataset.index);
                        reorderColumns(fromIdx, toIdx);
                    } else {
                        moveTaskTo(id, status);
                    }
                });
                // Column drag start using handle
                const handle = col.querySelector('.col-drag');
                if (handle){
                    // Mantener el handle como punto de arrastre de columna
                    handle.addEventListener('mousedown', () => { col.setAttribute('data-dragging','true'); });
                    handle.setAttribute('draggable','true');
                    // Evitar que toda la columna sea draggable para no confundir con tareas
                    const colRoot = handle.closest('.column');
                    if (colRoot) colRoot.draggable = false;
                }
                // Drag desde el handle de columna
                handle?.addEventListener('dragstart', e => {
                    const colRoot = handle.closest('.column') || col;
                    if (e.dataTransfer){
                        e.dataTransfer.setData('text/plain', 'col_' + colRoot.dataset.index);
                        e.dataTransfer.effectAllowed = 'move';
                    }
                    colRoot.classList.add('dragging');
                });
                handle?.addEventListener('dragend', () => {
                    const colRoot = handle.closest('.column') || col;
                    colRoot.classList.remove('dragging');
                    colRoot.removeAttribute('data-dragging');
                });
            });
        }

        function addTaskFromModal(data){
            const id = 't_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
            const task = {
                id,
                title: data.title,
                status: data.status || columns[0]?.key || 'pendiente',
                startDate: data.startDate || '',
                endDate: data.endDate || '',
                assignee: data.assignee || '',
                comments: data.comments || ''
            };
            tasks.unshift(task);
            saveTasks();
            render();
            // feedback: highlight target list
            const targetList = document.getElementById(`list-${task.status}`);
            if (targetList){
                targetList.classList.add('list-highlight');
                setTimeout(() => targetList.classList.remove('list-highlight'), 900);
            }
        }

        function removeTask(id){
            tasks = tasks.filter(x => x.id !== id);
            saveTasks();
            render();
        }

        function moveTaskTo(id, status){
            const t = tasks.find(x => x.id === id);
            if (!t) return;
            t.status = status;
            saveTasks();
            render();
        }

        function addColumn(name){
            const trimmed = name.trim();
            if (!trimmed) return { ok:false, msg:'El nombre es obligatorio.' };
            const key = normKey(trimmed);
            if (columns.some(c => c.key === key) || columns.some(c => c.name.toLowerCase() === trimmed.toLowerCase())){
                return { ok:false, msg:'Ya existe una columna con ese nombre.' };
            }
            columns.push({ key, name: trimmed });
            saveColumns();
            render();
            return { ok:true };
        }

        function renameColumn(key, newName){
            const trimmed = newName.trim();
            if (!trimmed) return { ok:false, msg:'El nombre es obligatorio.' };
            const exists = columns.some(c => c.name.toLowerCase() === trimmed.toLowerCase());
            if (exists) return { ok:false, msg:'Ya existe una columna con ese nombre.' };
            const c = columns.find(c => c.key === key);
            if (!c) return { ok:false, msg:'Columna no encontrada.' };
            c.name = trimmed;
            saveColumns();
            render();
            return { ok:true };
        }

        function deleteColumn(key){
            if (columns.length <= 1) return { ok:false, msg:'Debe existir al menos una columna.' };
            const idx = columns.findIndex(c => c.key === key);
            if (idx === -1) return { ok:false, msg:'Columna no encontrada.' };
            const fallbackKey = columns[0].key === key ? (columns[1]?.key || columns[0].key) : columns[0].key;
            tasks.forEach(t => { if (t.status === key) t.status = fallbackKey; });
            columns.splice(idx,1);
            saveTasks();
            saveColumns();
            render();
            return { ok:true };
        }

        function reorderColumns(fromIdx, toIdx){
            if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= columns.length || toIdx >= columns.length) return;
            const [moved] = columns.splice(fromIdx,1);
            columns.splice(toIdx,0,moved);
            saveColumns();
            render();
        }

        function escapeHtml(str){
            return str
                .replaceAll('&','&amp;')
                .replaceAll('<','&lt;')
                .replaceAll('>','&gt;')
                .replaceAll('"','&quot;')
                .replaceAll("'",'&#39;');
        }

        // Toast message helper
        const toastEl = document.getElementById('toast');
        let toastTimer = null;
        function showToast(text, type='info', duration=3000){
            if (!toastEl) return;
            const safe = (text || '').toString();
            // optional icon for warning
            if (type === 'warning'){
                toastEl.innerHTML = `<span class="icon">⚠️</span>${safe}`;
                toastEl.classList.add('warning');
            } else {
                toastEl.textContent = safe;
                toastEl.classList.remove('warning');
            }
            toastEl.classList.add('show');
            if (toastTimer) { clearTimeout(toastTimer); }
            toastTimer = setTimeout(() => {
                toastEl.classList.remove('show');
            }, duration);
        }

        // --- Comment Modal (dynamic) ---
        let commentModal = null;
        let commentTextarea = null;
        let commentSaveBtn = null;
        let commentDeleteBtn = null;
        let commentCancelBtn = null;
        let currentCommentTaskId = null;

        function ensureCommentModal(){
            if (commentModal) return;
            commentModal = document.createElement('div');
            commentModal.id = 'commentModal';
            commentModal.className = 'modal hidden';
            commentModal.setAttribute('aria-hidden','true');
            commentModal.innerHTML = `
                <div class="modal-content" style="max-width:520px">
                    <div style="margin-bottom:10px">
                        <h3 style="margin:0">Comentarios</h3>
                        <div id="cm_title" style="margin-top:6px;color:#6b7280;font-size:13px"></div>
                    </div>
                    <textarea id="cm_text" rows="6" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px"></textarea>
                        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">
                            <button id="cm_delete" class="icon-btn" title="Eliminar comentarios">🗑️ Eliminar</button>
                            <button id="cm_cancel" class="icon-btn" title="Cancelar">✖️ Cancelar</button>
                            <button id="cm_save" class="primary" title="Guardar">Guardar</button>
                        </div>
                </div>`;
            document.body.appendChild(commentModal);
            commentTextarea = commentModal.querySelector('#cm_text');
            const commentTitleEl = commentModal.querySelector('#cm_title');
            commentSaveBtn = commentModal.querySelector('#cm_save');
            commentDeleteBtn = commentModal.querySelector('#cm_delete');
            commentCancelBtn = commentModal.querySelector('#cm_cancel');

            commentCancelBtn.addEventListener('click', closeCommentModal);
            commentModal.addEventListener('click', (e) => { if (e.target === commentModal) closeCommentModal(); });
            commentSaveBtn.addEventListener('click', () => {
                if (!currentCommentTaskId) return;
                const t = tasks.find(x => x.id === currentCommentTaskId);
                if (!t) return;
                t.comments = (commentTextarea.value || '').trim();
                saveTasks();
                showToast('Comentarios actualizados');
                closeCommentModal();
            });
            commentDeleteBtn.addEventListener('click', () => {
                if (!currentCommentTaskId) return;
                const t = tasks.find(x => x.id === currentCommentTaskId);
                if (!t) return;
                t.comments = '';
                saveTasks();
                showToast('Comentarios eliminados', 'warning');
                closeCommentModal();
            });
        }
        function openCommentModal(task){
            ensureCommentModal();
            currentCommentTaskId = task.id;
            commentTextarea.value = task.comments || '';
            const title = (task.title || '').toString();
            const commentTitleEl = commentModal.querySelector('#cm_title');
            if (commentTitleEl){
                commentTitleEl.textContent = `Tarea: ${title}`;
            }
            commentModal.classList.remove('hidden');
            commentModal.setAttribute('aria-hidden','false');
            commentTextarea.focus();
        }
        function closeCommentModal(){
            if (!commentModal) return;
            commentModal.classList.add('hidden');
            commentModal.setAttribute('aria-hidden','true');
            currentCommentTaskId = null;
        }

        // Modal logic
        const modal = document.getElementById('taskModal');
        const taskForm = document.getElementById('taskForm');
        const mTitle = document.getElementById('m_title');
        const mStart = document.getElementById('m_start');
        const mEnd = document.getElementById('m_end');
        const mAssignee = document.getElementById('m_assignee');
        const mComments = document.getElementById('m_comments');
        const mError = document.getElementById('m_error');
        const mCancel = document.getElementById('m_cancel');
        const mStatus = document.getElementById('m_status');

        // Column modal elements
        const colModal = document.getElementById('colModal');
        const colForm = document.getElementById('colForm');
        const cName = document.getElementById('c_name');
        const cError = document.getElementById('c_error');
        const cCancel = document.getElementById('c_cancel');

        // Column header action handlers (delegate after render)
        document.addEventListener('click', (e) => {
            const renameBtn = e.target.closest('.col-rename');
            const deleteBtn = e.target.closest('.col-delete');
            if (renameBtn){
                const colEl = renameBtn.closest('.column');
                const key = colEl?.dataset.status;
                openRenameModal(key);
                return;
            }
            if (deleteBtn){
                if (isDeleteBlocked){
                    // Si está oculto, no hacer nada.
                    return;
                }
                const colEl = deleteBtn.closest('.column');
                const key = colEl?.dataset.status;
                openDeleteModal(key);
                return;
            }
        });

        function fillStatusOptions(selectedKey){
            mStatus.innerHTML = '';
            columns.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.key;
                opt.textContent = c.name;
                if (selectedKey && selectedKey === c.key) opt.selected = true;
                mStatus.appendChild(opt);
            });
        }

        function openModal(existing){
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
            mError.textContent = '';
            if (existing){
                mTitle.value = existing.title || '';
                fillStatusOptions(existing.status || columns[0]?.key);
                mStart.value = existing.startDate || '';
                mEnd.value = existing.endDate || '';
                mAssignee.value = existing.assignee || '';
                mComments.value = existing.comments || '';
                taskForm.dataset.editId = existing.id;
            } else {
                mTitle.value = input.value.trim();
                const last = localStorage.getItem(STORAGE_LAST_STATUS) || columns[0]?.key;
                fillStatusOptions(last);
                mStart.value = '';
                mEnd.value = '';
                mAssignee.value = '';
                mComments.value = '';
                delete taskForm.dataset.editId;
            }
            mTitle.focus();
        }
        function closeModal(){
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
        }

        function openColModal(){
            colModal.classList.remove('hidden');
            colModal.setAttribute('aria-hidden', 'false');
            cError.textContent = '';
            cName.value = '';
            cName.focus();
        }
        function closeColModal(){
            colModal.classList.add('hidden');
            colModal.setAttribute('aria-hidden', 'true');
        }

        // Rename column modal logic
        const colRenameModal = document.getElementById('colRenameModal');
        const colRenameForm = document.getElementById('colRenameForm');
        const crName = document.getElementById('cr_name');
        const crError = document.getElementById('cr_error');
        const crCancel = document.getElementById('cr_cancel');
        let crKey = null;

        function openRenameModal(key){
            crKey = key;
            const current = columns.find(c => c.key === key)?.name || '';
            crName.value = current;
            crError.textContent = '';
            colRenameModal.classList.remove('hidden');
            colRenameModal.setAttribute('aria-hidden','false');
            crName.focus();
        }
        function closeRenameModal(){
            colRenameModal.classList.add('hidden');
            colRenameModal.setAttribute('aria-hidden','true');
            crKey = null;
        }

        crCancel.addEventListener('click', () => closeRenameModal());
        colRenameModal.addEventListener('click', (e) => { if (e.target === colRenameModal) closeRenameModal(); });
        colRenameForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nuevo = crName.value.trim();
            const res = renameColumn(crKey, nuevo);
            if (!res.ok){ crError.textContent = res.msg; crName.focus(); return; }
            closeRenameModal();
        });

        // Delete confirm modal logic
        const colDeleteModal = document.getElementById('colDeleteModal');
        const cdCancel = document.getElementById('cd_cancel');
        const cdConfirm = document.getElementById('cd_confirm');
        let cdKey = null;

        function openDeleteModal(key){
            cdKey = key;
            colDeleteModal.classList.remove('hidden');
            colDeleteModal.setAttribute('aria-hidden','false');
        }
        function closeDeleteModal(){
            colDeleteModal.classList.add('hidden');
            colDeleteModal.setAttribute('aria-hidden','true');
            cdKey = null;
        }
        cdCancel.addEventListener('click', () => closeDeleteModal());
        colDeleteModal.addEventListener('click', (e) => { if (e.target === colDeleteModal) closeDeleteModal(); });
        cdConfirm.addEventListener('click', () => {
            const res = deleteColumn(cdKey);
            if (!res.ok) alert(res.msg);
            closeDeleteModal();
        });

        // Task delete confirm modal logic
        const taskDeleteModal = document.getElementById('taskDeleteModal');
        const tdMessage = document.getElementById('td_message');
        const tdCancel = document.getElementById('td_cancel');
        const tdConfirm = document.getElementById('td_confirm');
        let tdId = null;

        function openTaskDeleteModal(task){
            tdId = task.id;
            const msg = task.comments && task.comments.trim() ? task.comments.trim() : 'Esta acción eliminará la tarea.';
            tdMessage.textContent = msg;
            taskDeleteModal.classList.add('danger');
            taskDeleteModal.classList.remove('hidden');
            taskDeleteModal.setAttribute('aria-hidden','false');
        }
        function closeTaskDeleteModal(){
            taskDeleteModal.classList.add('hidden');
            taskDeleteModal.setAttribute('aria-hidden','true');
            taskDeleteModal.classList.remove('danger');
            tdId = null;
        }
        tdCancel.addEventListener('click', () => closeTaskDeleteModal());
        taskDeleteModal.addEventListener('click', (e) => { if (e.target === taskDeleteModal) closeTaskDeleteModal(); });
        tdConfirm.addEventListener('click', () => {
            if (tdId){
                const t = tasks.find(x => x.id === tdId);
                const msg = t && t.comments ? t.comments.trim() : 'Tarea eliminada.';
                removeTask(tdId);
                showToast(msg, 'warning');
            }
            closeTaskDeleteModal();
        });

        addBtn.addEventListener('click', () => openModal());
        document.getElementById('addForm').addEventListener('submit', (e) => {
            e.preventDefault();
            openModal();
        });
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                openModal();
            }
        });

        mCancel.addEventListener('click', () => closeModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Column modal handlers
        addColumnBtn.addEventListener('click', () => openColModal());
        cCancel.addEventListener('click', () => closeColModal());
        colModal.addEventListener('click', (e) => { if (e.target === colModal) closeColModal(); });
        colForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = cName.value.trim();
            const res = addColumn(name);
            if (!res.ok){
                cError.textContent = res.msg;
                cName.focus();
                return;
            }
            closeColModal();
        });

        // Bloquear reinicio para el usuario ortega con contraseña ortega123 (mostrar deshabilitado con tooltip)
        if (resetBtn && typeof isDeleteBlocked !== 'undefined' && isDeleteBlocked){
            resetBtn.disabled = true;
            resetBtn.title = 'No tienes permiso para reiniciar datos';
            resetBtn.classList.add('disabled');
        }
        if (resetBtn){
            // Replace native confirms with styled double-step modals
            let resetModalStep1 = null;
            let resetModalStep2 = null;
            function ensureResetModals(){
                if (!resetModalStep1){
                    resetModalStep1 = document.createElement('div');
                    resetModalStep1.className = 'modal hidden';
                    resetModalStep1.id = 'resetModal1';
                    resetModalStep1.setAttribute('aria-hidden','true');
                    resetModalStep1.innerHTML = `
                        <div class="modal-content" style="max-width:560px">
                            <div style="margin-bottom:10px">
                                <h3 style="margin:0">Reiniciar datos</h3>
                                <div style="margin-top:6px;color:#6b7280;font-size:13px">Se eliminarán todas las tareas y se restaurarán las columnas iniciales.</div>
                            </div>
                            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">
                                <button id="rm1_cancel" class="icon-btn" title="Cancelar">✖️ Cancelar</button>
                                <button id="rm1_next" class="primary" title="Continuar">Continuar</button>
                            </div>
                        </div>`;
                    document.body.appendChild(resetModalStep1);
                    const rm1Cancel = resetModalStep1.querySelector('#rm1_cancel');
                    const rm1Next = resetModalStep1.querySelector('#rm1_next');
                    rm1Cancel.addEventListener('click', () => closeResetModal(resetModalStep1));
                    resetModalStep1.addEventListener('click', (e) => { if (e.target === resetModalStep1) closeResetModal(resetModalStep1); });
                    rm1Next.addEventListener('click', () => {
                        closeResetModal(resetModalStep1);
                        openResetModal(resetModalStep2);
                    });
                }
                if (!resetModalStep2){
                    resetModalStep2 = document.createElement('div');
                    resetModalStep2.className = 'modal hidden';
                    resetModalStep2.id = 'resetModal2';
                    resetModalStep2.setAttribute('aria-hidden','true');
                    resetModalStep2.innerHTML = `
                        <div class="modal-content" style="max-width:560px">
                            <div style="margin-bottom:10px">
                                <h3 style="margin:0">Confirmar reinicio</h3>
                                <div style="margin-top:6px;color:#6b7280;font-size:13px">Esta acción es irreversible. Ingresa la contraseña para continuar.</div>
                            </div>
                            <div style="display:flex;flex-direction:column;gap:8px">
                                <div style="display:flex;align-items:center;gap:8px">
                                    <input id="rm2_pass" type="password" placeholder="Contraseña" style="flex:1;padding:10px;border:1px solid #e2e8f0;border-radius:10px;font-size:13px" />
                                    <button id="rm2_toggle" class="icon-btn" title="Mostrar/ocultar">👁️</button>
                                </div>
                                <div id="rm2_error" style="color:#b91c1c;font-size:12px;display:none">Contraseña incorrecta.</div>
                                <div style="display:flex;gap:8px;justify-content:flex-end">
                                    <button id="rm2_cancel" class="icon-btn" title="Cancelar">✖️ Cancelar</button>
                                    <button id="rm2_confirm" class="icon-btn" title="Reiniciar">🗑️ Reiniciar</button>
                                </div>
                            </div>
                        </div>`;
                    document.body.appendChild(resetModalStep2);
                    const rm2Cancel = resetModalStep2.querySelector('#rm2_cancel');
                    const rm2Confirm = resetModalStep2.querySelector('#rm2_confirm');
                    const rm2Pass = resetModalStep2.querySelector('#rm2_pass');
                    const rm2Error = resetModalStep2.querySelector('#rm2_error');
                    const rm2Toggle = resetModalStep2.querySelector('#rm2_toggle');
                    rm2Cancel.addEventListener('click', () => closeResetModal(resetModalStep2));
                    resetModalStep2.addEventListener('click', (e) => { if (e.target === resetModalStep2) closeResetModal(resetModalStep2); });
                    rm2Toggle.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (!rm2Pass) return;
                        rm2Pass.type = rm2Pass.type === 'password' ? 'text' : 'password';
                        rm2Toggle.textContent = rm2Pass.type === 'password' ? '👁️' : '🙈';
                    });
                    rm2Confirm.addEventListener('click', () => {
                        const val = (rm2Pass?.value || '').trim();
                        if (val !== 'duran 123'){
                            if (rm2Error){ rm2Error.style.display = 'block'; }
                            rm2Pass?.focus();
                            return;
                        }
                        if (rm2Error){ rm2Error.style.display = 'none'; }
                        closeResetModal(resetModalStep2);
                        resetData();
                        showToast('Datos reiniciados a los valores predeterminados.', 'warning', 4500);
                    });
                }
            }
            function openResetModal(modalEl){
                if (!modalEl) return;
                modalEl.classList.remove('hidden');
                modalEl.setAttribute('aria-hidden','false');
            }
            function closeResetModal(modalEl){
                if (!modalEl) return;
                modalEl.classList.add('hidden');
                modalEl.setAttribute('aria-hidden','true');
            }
            resetBtn.addEventListener('click', () => {
                ensureResetModals();
                openResetModal(resetModalStep1);
            });
        }

        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Simple validation
            const title = mTitle.value.trim();
            const startDate = mStart.value || '';
            const endDate = mEnd.value || '';
            const assignee = mAssignee.value.trim();
            const comments = mComments.value.trim();
            const statusSel = mStatus.value || columns[0]?.key || 'pendiente';
            localStorage.setItem(STORAGE_LAST_STATUS, statusSel);
            if (!title){
                mError.textContent = 'El nombre de la tarea es obligatorio.';
                mTitle.focus();
                return;
            }
            if (startDate && endDate && startDate > endDate){
                mError.textContent = 'La fecha mínima no puede ser mayor que la máxima.';
                mStart.focus();
                return;
            }

            const editId = taskForm.dataset.editId;
            if (editId){
                const t = tasks.find(x => x.id === editId);
                if (t){
                    t.title = title;
                    t.status = statusSel;
                    t.startDate = startDate;
                    t.endDate = endDate;
                    t.assignee = assignee;
                    t.comments = comments;
                    saveTasks();
                    render();
                    const targetList = document.getElementById(`list-${t.status}`);
                    if (targetList){
                        targetList.classList.add('list-highlight');
                        setTimeout(() => targetList.classList.remove('list-highlight'), 900);
                    }
                }
            } else {
                addTaskFromModal({ title, status: statusSel, startDate, endDate, assignee, comments });
            }
            closeModal();
            input.value = '';
            input.focus();
        });

        loadTasks();
        loadColumns();
        render();
    