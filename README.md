# TP #2 — Red Social (Backend / Server) — Programación IV

Backend (API REST) de una aplicación tipo **“Red Social”** desarrollada como Trabajo Práctico de **Programación IV**.  
El objetivo del servidor es proveer autenticación segura con **JWT**, persistencia en **MongoDB** y endpoints para manejar **usuarios**, **publicaciones**, **comentarios**, **likes** y **estadísticas** para el dashboard de administrador.

> Este repositorio contiene únicamente el **backend (NestJS)**.  
> El **frontend (Angular)** se encuentra en:  
> https://github.com/JoaquinCarbonaro/Joaquin-Carbonaro-TP2-PROG4-2025-C2-CLIENT.git

## 🚀 Demo (Deploy)
- Render (API): https://joaquin-carbonaro-tp2-prog4-2025-c2.onrender.com
- Vercel (Frontend): https://joaquin-carbonaro-tp-2-prog-4-2025.vercel.app/

> Nota: la API está en Render (free tier). La primera request puede tardar por “cold start”.

---

## ✨ Funcionalidades principales (API)

### 🔐 Autenticación y seguridad (JWT + roles)
- Registro e inicio de sesión.
- Emisión de **JWT** con vencimiento (**15 minutos**).
- Endpoints para:
  - **autorizar** token (validación de sesión)
  - **refrescar** token (renovación sin volver a loguearse)
- Rutas protegidas con guards:
  - acceso para usuario logueado
  - acceso exclusivo **admin** (según rol)

### 👤 Usuarios (administración)
- Listado de usuarios.
- Alta de usuario (incluye rol usuario/admin).
- **Baja lógica / habilitar–deshabilitar** usuarios (sin borrar físicamente de la BD).

### 📝 Publicaciones
- Crear publicación (incluye imagen opcional).
- Listar publicaciones (feed) con filtros/ordenamiento y paginación según la implementación.
- **Likes**: dar / quitar like y persistir la interacción.
- Eliminación (propias y/o por admin) con enfoque de baja lógica.

### 💬 Comentarios
- Listar comentarios por publicación.
- Crear comentario.
- Editar comentario propio, marcando que fue modificado.
- Paginación (ej. “cargar más”).

### 📊 Estadísticas (para dashboard admin)
- Endpoints que devuelven métricas para alimentar gráficos del dashboard (consumidos por el frontend con ECharts).

---

## 🧰 Tecnologías usadas
- NestJS + TypeScript
- MongoDB + Mongoose
- JWT (`@nestjs/jwt`)
- bcrypt (hash de contraseñas)
- DTOs y validaciones (`class-validator` / `class-transformer`)
- Multer (subida de imágenes)

---

## 🗃️ Persistencia (modelo de datos)
El servidor guarda información en MongoDB para:
- usuarios (perfil, rol, estado habilitado/deshabilitado)
- publicaciones (contenido, autor, likes, estado/baja lógica)
- comentarios (autor, publicación, `modificado`)
- métricas/estadísticas (según endpoints del dashboard)

---

## ✅ Contexto del TP
El trabajo se organizó por sprints e incluye: autenticación con expiración/renovación, control de acceso por roles, ABM lógico, endpoints para publicaciones/comentarios/likes, manejo de imágenes y estadísticas para administrador, respetando buenas prácticas y códigos HTTP adecuados.

---

## 💡 Lo que demuestra este proyecto
- **Backend API REST completo** con NestJS (módulos, servicios, controllers, DTOs).
- **Seguridad**: JWT, guards, roles, y manejo de expiración/refresh.
- **Persistencia y modelado** en MongoDB (colecciones separadas por dominio).
- **Manejo de archivos** (imágenes) integrado al flujo de publicaciones/perfil.
- **Soporte para analítica**: endpoints pensados para un dashboard con métricas.

---

## 👤 Autor
Joaquín Carbonaro
