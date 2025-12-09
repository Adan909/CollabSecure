# CollabSecure

CollabSecure es una aplicación web sencilla enfocada en colaboración/seguridad con una página principal y estilos asociados.

## integrantes
Victor Mateo Alcócer López

Jhesly Lisseth Castillo Martínez

Diego Roberto Corrales Espinoza

Jorge Adán Ortega Torres

Dannia María Pérez Rivera




## Descripción

Este repositorio contiene archivos HTML, CSS y JavaScript que conforman la interfaz de la aplicación. El flujo típico inicia en `index.html` o `homepage.html` según la configuración deseada.

## Estructura del Proyecto

```
CollabSecure/
├─ app.js
├─ homepage.css
├─ homepage.html
├─ index.html
├─ jsHomepage.js
└─ style.css
```

- `index.html`: Entrada principal del sitio (landing o índice).
- `homepage.html`: Página de inicio alternativa/privada según el flujo deseado.
- `style.css`: Estilos generales del sitio.
- `homepage.css`: Estilos específicos para `homepage.html`.
- `jsHomepage.js`: Lógica de interacción para la página de inicio.
- `app.js`: Script de aplicación (puede usarse para lógica adicional o backend ligero si es Node, revisar su contenido).

## Requisitos

- Navegador web moderno (Chrome, Edge, Firefox, Safari).
- Opcional: Node.js (si `app.js` actúa como servidor). Si no, puede abrirse de forma estática.

## Cómo Ejecutar

### Opción A: Abrir de forma estática
1. Abrir `index.html` haciendo doble clic o:
   - Windows: clic derecho → Abrir con → elegir navegador.
2. Si deseas ir directo a la página de inicio, abrir `homepage.html`.

### Opción B: Servir con un servidor local (opcional)
Si deseas evitar restricciones de CORS o probar rutas, puedes usar un servidor simple:

- Con Node (instalando `http-server` globalmente):
  ```powershell
  npm install -g http-server
  http-server . -p 8080
  ```
  Luego visitar `http://localhost:8080/index.html`.

- Si `app.js` es un servidor Node (revisar el contenido):
  1. Instala dependencias si aplica:
     ```powershell
     npm install
     ```
  2. Ejecuta el servidor:
     ```powershell
     node app.js
     ```
  3. Abre el navegador en la URL indicada en consola (p.ej. `http://localhost:3000`).

## Desarrollo

- Modifica estilos en `style.css` y `homepage.css`.
- Añade o ajusta interacción en `jsHomepage.js`.
- Estructura y contenido en `index.html` y `homepage.html`.
- Si se usa un backend o lógica adicional, verificar y editar `app.js`.

## Buenas Prácticas

- Mantener consistencia de estilos entre `style.css` y `homepage.css`.
- Evitar duplicar lógica en múltiples archivos JS.
- Probar en varios navegadores.

## Contribución

1. Crear una rama (`git checkout -b feature/nombre-feature`).
2. Realizar cambios y realizar commits descriptivos.
3. Enviar Pull Request contra la rama principal adecuada.



## Licencia

No se declara una licencia en este repositorio. Si corresponde, agregar una en el futuro.

## Link
https://adan909.github.io/CollabSecure/ 
