# Documentación ProGanadero

## Stack de Desarrollo

Tecnología | Versión
--- | ---
PHP | 8.2 o superior
Laravel | 12.x
MySQL | 8.x
Bootstrap | 5.x
jQuery DataTables | (Server-side AJAX)
Laravel Sanctum | 4.0
Laravel Reverb (WebSockets) | 1.7
Maatwebsite/Excel | 3.1
MercadoPago (dx-php) | 3.8
Vite | 6.x
Tailwind CSS | 4.0 (parcial, junto a Bootstrap)
Pusher.js | 8.4
Axios | 1.8
Font Awesome + Bootstrap Icons | —

---

## Instalación del Proyecto

**Paso 1: Clonar el proyecto**
git clone URL_DEL_REPOSITORIO y luego cd proganadero-landing-y-back-clientes

**Paso 2: Instalar dependencias PHP**
composer install

**Paso 3: Instalar dependencias JavaScript**
npm install

**Paso 4: Configurar el archivo .env**
Ejecutar cp .env.example .env y php artisan key:generate. Luego editar el archivo .env con las credenciales de las bases de datos:

**Base de datos principal (cliente):**
Conexión: mysql | Host: 127.0.0.1 | Puerto: 3306 | Nombre: proganadero_client | Usuario: root

**Base de datos secundaria (admin):**
Conexión: mysql_admin | Host: 127.0.0.1 | Puerto: 3306 | Nombre: proganadero_admin | Usuario: root

Nota: El sistema requiere que ambas bases de datos estén creadas previamente en MySQL.

**Paso 5: Ejecutar las migraciones**
php artisan migrate

**Paso 6: Ejecutar los seeders iniciales**
php artisan db:seed

**Paso 7: Ambiente local (desarrollo)**
npm run dev

**Paso 8: Ambiente de producción**
npm run build

**Paso 9: Iniciar el servidor**
php artisan serve

**Paso 10: Modo desarrollo completo**
composer dev — Ejecuta en paralelo: servidor PHP, cola de trabajos, logs en tiempo real (Pail) y Vite.

### Servicios Adicionales (Opcionales)
• WebSockets (Laravel Reverb): php artisan reverb:start
• Cola de trabajos: php artisan queue:listen

### Claves API requeridas (.env)
• BREVO_API_KEY: Brevo (envío de correos)
• GOOGLE_MAPS_API_KEY: Google Maps
• PUSHER_APP_KEY: Pusher / Reverb

---

## Arquitectura Multi-Base de Datos

El sistema opera con dos bases de datos MySQL independientes conectadas simultáneamente:

**Base de Datos Client (mysql)**
Almacena datos operativos como eventos reproductivos, sanitarios, destetes, muertes, balances económicos, alimentación, logs y configuraciones de análisis.

**Base de Datos Admin (mysql_admin)**
Almacena datos maestros como campos, rodeos, lotes, stocks, tipos de animales, razas, planes de suscripción, órdenes de pago y recursos forrajeros.

---

## Patrón de Autenticación

### Autenticación Web (Sesión)
• El usuario se autentica contra la tabla users de proganadero_client.
• Su perfil y plan se consultan en proganadero_admin.profiles.
• La sesión almacena el objeto user completo (session('user')).
• Middleware VerifyAuth: Verifica la existencia de sesión.
• Middleware CheckSubscription: Valida plan activo.

### Autenticación API (Sanctum)
• Utiliza Laravel Sanctum con tokens para apps móviles.
• Middleware auth.api + plan.api para validación y suscripción.

---

## Módulos de la Aplicación (Parte 1)

Módulo | Descripción
--- | ---
Dashboard | Panel principal del usuario.
Campos (Fields) | CRUD de establecimientos agropecuarios.
Lotes (Batches) | CRUD de lotes dentro de un campo.
Rodeos | CRUD de rodeos dentro de un campo.
Stocks (Animales) | CRUD de animales individuales con importación Excel.
Toros (Bulls) | Gestión de datos específicos de toros.
Eventos Reproductivos | Registro de eventos por animal.
Eventos Sanitarios | Registro de tratamientos sanitarios.

## Módulos de la Aplicación (Parte 2)

Módulo | Descripción
--- | ---
Calendario Sanitario | Planificación sanitaria anual.
Destetes (Weanings) | Proceso complejo de transformación y métricas.
Muertes / Ventas | Registro de eventos de salida del sistema.
Alimentación | Registro de pesajes y alimentación.
Pastoreos | Registro de movimientos entre rodeos.
Recría y Engorde | Registro de dietas con bases nutricionales.
Balance Económico | Registro de ingresos y egresos.
Detalle de Ventas | Cálculos automáticos de kilos y precios.
Análisis Productivo | Dashboard analítico de indicadores de eficiencia.
Análisis Reproductivo | Dashboard analítico de tasas de preñez.
Logs de Auditoría | Registro de todas las acciones por módulo.
Planes de Suscripción | Gestión de pagos vía MercadoPago.

---

## Rutas de la Aplicación

Método | URI | Controlador | Descripción
--- | --- | --- | ---
GET | / | HomeController@index | Landing page pública
GET | /politica | Vista directa |Privacidad
GET | /auth | LoginController@show | Login
POST | /login | LoginController@login | Procesa login
POST | /register | RegisterController@register | Registro
GET | /logout | LoginController@logout | Cierra sesión
POST | /webhook | PaymentController@handle | Webhook MercadoPago

---

## Modelo de Datos

**Base de datos: proganadero_client**
Users, Logs, Reproductions, Sanitary, Deaths, Weanings, Grazings, Economic_balances, Balance_sales.

**Base de datos: proganadero_admin**
Fields, Batches, Rodeos, Stocks, Plans, Profiles.

---

## Lógica de Negocio Principal

**Suscripción y Pagos**
Selección de plan -> Creación en MercadoPago -> Validación vía Middleware CheckSubscription.

**Importación Excel**
Procesamiento masivo de Stocks y Reproducciones con validaciones de integridad.

---

## Estructura de Vistas

• layouts/panel.blade.php: Layout del dashboard.
• dashboard.blade.php: Panel principal.
• auth/: Vistas de acceso.
• stocks/: Gestión de animales.
• emails/: Templates de Brevo.

---

> **Nota:** Documentación generada a partir del análisis del código fuente ProGanadero.
