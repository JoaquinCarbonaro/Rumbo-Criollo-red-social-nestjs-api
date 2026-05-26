# Rumbo Criollo — Red Social Backend API

Backend/API REST de una aplicación web tipo **red social** desarrollada con **NestJS, TypeScript y MongoDB**.

Este proyecto fue realizado como **Trabajo Práctico N.º 2 de la materia Programación IV**. El objetivo del servidor es proveer autenticación segura con JWT, persistencia en MongoDB y endpoints para usuarios, publicaciones, comentarios, likes y estadísticas del dashboard administrador.

Este repositorio contiene únicamente el **backend/API** de la aplicación.

Frontend:

https://github.com/JoaquinCarbonaro/Rumbo-Criollo-red-social-angular-frontend

---

## 🚀 Demo

El frontend de la aplicación se encuentra desplegado en Vercel y puede visualizarse desde el siguiente enlace:

https://joaquin-carbonaro-tp-2-prog-4-2025.vercel.app

La API fue desplegada originalmente en Render:

https://joaquin-carbonaro-tp2-prog4-2025-c2.onrender.com

> Nota: algunas funcionalidades pueden no estar disponibles actualmente porque dependen de la API, la base de datos o servicios externos utilizados para el trabajo práctico. De todas formas, el deploy del frontend permite visualizar la interfaz general de la aplicación y el proyecto demuestra integración entre frontend, backend y base de datos.

Repositorio backend/API:

https://github.com/JoaquinCarbonaro/Rumbo-Criollo-red-social-nestjs-api

Repositorio frontend:

https://github.com/JoaquinCarbonaro/Rumbo-Criollo-red-social-angular-frontend

---

## ✨ Funcionalidades principales

### 🔐 Autenticación y seguridad

- Registro de usuarios.
- Inicio de sesión.
- Hash de contraseñas con bcrypt.
- Emisión de JWT.
- Validación de sesión.
- Renovación de token.
- Rutas protegidas mediante guards.
- Control de acceso por roles.
- Acceso diferenciado para usuarios y administradores.

---

## 👤 Usuarios

- Listado de usuarios.
- Alta de usuarios.
- Alta de administradores.
- Gestión de roles.
- Habilitación y deshabilitación de usuarios.
- Baja lógica sin eliminación física de la base de datos.

---

## 📝 Publicaciones

- Creación de publicaciones.
- Publicaciones con texto e imagen opcional.
- Listado de publicaciones para feed.
- Filtros y ordenamiento según implementación.
- Paginación según implementación.
- Likes.
- Eliminación de publicaciones propias.
- Eliminación de publicaciones por administrador.
- Baja lógica de publicaciones.

---

## 💬 Comentarios

- Listado de comentarios por publicación.
- Creación de comentarios.
- Edición de comentarios propios.
- Marcado de comentarios modificados.
- Paginación para cargar más comentarios.

---

## 📊 Estadísticas

Endpoints orientados a alimentar el dashboard administrador del frontend.

Incluye métricas relacionadas con:

- Usuarios.
- Publicaciones.
- Comentarios.
- Likes.
- Actividad general de la red social.

---

## 🖼️ Manejo de imágenes

- Subida de imágenes mediante Multer.
- Imágenes asociadas a publicaciones o perfiles según el flujo implementado.
- Integración con los endpoints correspondientes.

---

## 🧰 Tecnologías usadas

- NestJS
- TypeScript
- MongoDB
- Mongoose
- JWT
- bcrypt
- DTOs
- class-validator
- class-transformer
- Multer
- API REST
- Git
- GitHub

---

## 🗃️ Persistencia de datos

El servidor guarda información en MongoDB para:

- Usuarios.
- Roles.
- Estado de usuario habilitado/deshabilitado.
- Publicaciones.
- Likes.
- Comentarios.
- Estado de edición de comentarios.
- Métricas y estadísticas para dashboard.

---

## 🔗 Integración con frontend

Este backend es consumido por un frontend desarrollado con **Angular y TypeScript**.

El frontend se encuentra en:

https://github.com/JoaquinCarbonaro/Rumbo-Criollo-red-social-angular-frontend

---

## ✅ Contexto académico

Este proyecto fue desarrollado como parte de **Programación IV**.

El trabajo se organizó por etapas e incluye:

- Autenticación con JWT.
- Expiración y renovación de sesión.
- Control de acceso por roles.
- Endpoints para usuarios.
- Endpoints para publicaciones.
- Endpoints para comentarios.
- Manejo de likes.
- Manejo de imágenes.
- Estadísticas para administrador.
- Buenas prácticas de API REST.

---

## 💡 Lo que demuestra este proyecto

- Desarrollo backend con NestJS y TypeScript.
- Construcción de una API REST completa.
- Autenticación segura con JWT.
- Hash de contraseñas con bcrypt.
- Uso de guards y control de roles.
- Persistencia y modelado con MongoDB y Mongoose.
- Validación de datos con DTOs.
- Manejo de archivos con Multer.
- Organización por módulos, controladores y servicios.
- Integración con frontend Angular.
- Soporte para dashboard con estadísticas.

---

## 👤 Autor

**Joaquín Carbonaro**

GitHub: https://github.com/JoaquinCarbonaro  
LinkedIn: https://www.linkedin.com/in/joaquin-carbonaro
