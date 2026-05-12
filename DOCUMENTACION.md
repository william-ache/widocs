# Documentación ProGanadero Back-End

El Back-end está desarrollado en **PHP**, con la ayuda del framework **Laravel 12**, utilizando **Blade Templates** para las vistas del panel de administración y **Bootstrap 5** para el diseño front-end. El sistema opera con una arquitectura **multi-base de datos** (dos conexiones MySQL simultáneas) y cuenta con una **API REST** protegida con **Laravel Sanctum** para las aplicaciones móviles.

---

## Infraestructura

1. **Servidor de Hospedaje:** Digital Ocean
2. **Rutas de la aplicación:**
   - `/` ← Todo Laravel (raíz del proyecto)
   - `/public/` ← Carpeta pública (assets, punto de entrada)
3. **Base de Datos Principal (Cliente):** `proganadero_client`
4. **Base de Datos Secundaria (Admin):** `proganadero_admin`
5. **Dominio de Producción:** [Configurar en `.env` → `APP_URL`]

---

## Stack de Desarrollo

| Tecnología | Versión |
|---|---|
| PHP | 8.2 o superior |
| Laravel | 12.x |
| MySQL | 8.x |
| Bootstrap | 5.x |
| jQuery DataTables | (Server-side AJAX) |
| Laravel Sanctum | 4.0 |
| Laravel Reverb (WebSockets) | 1.7 |
| Maatwebsite/Excel | 3.1 |
| MercadoPago (dx-php) | 3.8 |
| Vite | 6.x |
| Tailwind CSS | 4.0 (parcial, junto a Bootstrap) |
| Pusher.js | 8.4 |
| Axios | 1.8 |
| Font Awesome + Bootstrap Icons | — |

---

## Instalación del Proyecto

1. **Clonar el proyecto:** `git clone [URL_DEL_REPOSITORIO]` y luego `cd proganadero-landing-y-back-clientes`

2. **Instalar dependencias PHP:** `composer install`

3. **Instalar dependencias JavaScript:** `npm install`

4. **Configurar el archivo `.env`:** Ejecutar `cp .env.example .env` y `php artisan key:generate`. Luego editar el archivo `.env` con las credenciales de las dos bases de datos:

   **Base de datos principal (cliente):**
   - **Conexión:** `mysql`
   - **Host:** `127.0.0.1`
   - **Puerto:** `3306`
   - **Nombre:** `proganadero_client`
   - **Usuario:** `root`
   - **Password:** `tu_password`

   **Base de datos secundaria (admin):**
   - **Conexión:** `mysql_admin`
   - **Host:** `127.0.0.1`
   - **Puerto:** `3306`
   - **Nombre:** `proganadero_admin`
   - **Usuario:** `root`
   - **Password:** `tu_password`

   **Nota:** El sistema requiere que ambas bases de datos (`proganadero_client` y `proganadero_admin`) estén creadas previamente en MySQL.

5. **Ejecutar las migraciones:** `php artisan migrate`

6. **Ejecutar los seeders iniciales:** `php artisan db:seed`

7. **Para el ambiente local (desarrollo):** `npm run dev`

8. **Para el ambiente de producción:** `npm run build`

9. **Iniciar el servidor de desarrollo:** `php artisan serve`

10. **Modo desarrollo completo (todos los servicios simultáneos):** `composer dev` — Este comando ejecuta en paralelo: servidor PHP, cola de trabajos, logs en tiempo real (Pail) y Vite.

### Servicios Adicionales (Opcionales)

- **WebSockets (Laravel Reverb):** `php artisan reverb:start`
- **Cola de trabajos:** `php artisan queue:listen`

### Claves API requeridas (archivo `.env`)

| Variable | Servicio | Uso |
|---|---|---|
| `BREVO_API_KEY` | Brevo (ex Sendinblue) | Envío de correos transaccionales |
| `GOOGLE_MAPS_API_KEY` | Google Maps | Mapas en la landing page |
| `PUSHER_APP_KEY` / `PUSHER_APP_SECRET` | Pusher / Reverb | WebSockets en tiempo real |

---

## Arquitectura Multi-Base de Datos

El sistema opera con **dos bases de datos MySQL independientes** conectadas simultáneamente:

1. **Base de Datos Client (`mysql`):** Almacena datos operativos como eventos reproductivos, sanitarios, destetes, muertes, balances económicos, alimentación, logs y configuraciones de análisis.
2. **Base de Datos Admin (`mysql_admin`):** Almacena datos maestros como campos, rodeos, lotes, stocks, tipos de animales, razas, planes de suscripción, órdenes de pago y recursos forrajeros.

Esta separación permite que un sistema de administración central (Back-office) gestione catálogos y planes de manera independiente al sistema del cliente.

---

## Patrón de Autenticación

### Autenticación Web (Sesión)
- El usuario se autentica contra la tabla `users` de `proganadero_client`.
- Su perfil, plan de suscripción y datos adicionales se consultan en `proganadero_admin.profiles`.
- La sesión almacena el objeto `user` completo, accesible mediante `session('user')`.
- Middleware de protección:
  - **`VerifyAuth`**: Verifica que exista un usuario en sesión.
  - **`CheckSubscription`**: Valida que el usuario tenga un plan activo y no expirado. Si ha caducado, envía un correo de notificación vía Brevo y redirige a la página de planes.

### Autenticación API (Sanctum – App Móvil)
- Se utiliza **Laravel Sanctum** con tokens para la autenticación de las aplicaciones móviles.
- Middleware: `auth.api` (valida token) + `plan.api` (verifica suscripción activa).

---

## Roles de la Aplicación

| Rol | Descripción |
|---|---|
| **Productor (Usuario Suscrito)** | Usuario con plan activo que puede acceder al dashboard completo. Gestiona campos, rodeos, stocks, eventos reproductivos, sanitarios, destetes, balances económicos y análisis productivos. El alcance de sus funcionalidades depende del plan contratado (límite de vientres). |
| **Usuario App Móvil** | Accede mediante la API REST con token Sanctum. Puede registrar eventos (reproducciones, sanitarios, muertes, alimentación), crear stocks y gestionar destetes desde la app. |

---

## Módulos de la Aplicación

| Módulo | Descripción |
|---|---|
| **Dashboard** | Panel principal del usuario donde se accede directamente a todos los módulos. Muestra estadísticas generales del establecimiento. |
| **Campos (Fields)** | CRUD de establecimientos agropecuarios. Cada campo tiene nombre, superficie y está asociado al usuario. |
| **Lotes (Batches)** | CRUD de lotes dentro de un campo. Incluye nombre, superficie y slug identificador. |
| **Rodeos** | CRUD de rodeos dentro de un campo. Incluye raza del animal y temporada reproductiva. |
| **Stocks (Animales)** | CRUD de animales individuales. Cada stock tiene índices IDV y EID, pertenece a un campo, rodeo, lote y tiene tipo de animal y raza. Soporta importación y exportación masiva desde Excel. Se aplica limitación de vientres según el plan de suscripción. |
| **Reunión de Stocks** | Vista especializada para consultar stocks agrupados por reunión. |
| **Toros (Bulls)** | Gestión de datos específicos de toros: examen físico (ojos, aplomos, circunferencia escrotal, testículos, pene/prepucio), capacidad de servicio, calidad de semen, y pruebas sanitarias (tricomoniasis, campylobacteriosis, brucelosis, tuberculosis). |
| **Eventos Reproductivos** | Registro de eventos reproductivos por animal con tres grupos de evaluación independientes: Pre-Servicio, Ecografía y Tacto. También registra datos de parto, inseminación y sanidad reproductiva (BRC/TBC). Soporta importación/exportación Excel. |
| **Eventos Sanitarios** | Registro de tratamientos sanitarios aplicados a animales o rodeos. Incluye código de tratamiento, fecha, dosis y marca. |
| **Calendario Sanitario** | Planificación sanitaria anual: matriz de 12 meses × N tipos de animal, donde cada celda almacena los códigos de tratamiento planificados. |
| **Destetes (Weanings)** | Proceso complejo que involucra tres tablas: cabecera del destete, stocks participantes y transformación del tipo de animal post-destete. Calcula métricas como kg/ha, kg/vientre preñado, porcentaje de destete y peso promedio. |
| **Muertes / Ventas (Deaths)** | Registro de eventos de muerte o venta de animales con número de guía. |
| **Alimentación (Feedings)** | Registro de pesajes y datos de alimentación por rodeo o animal individual. |
| **Pastoreos (Grazings)** | Registro de movimientos de pastoreo entre rodeos, con fechas de entrada y salida. |
| **Pastoreo Mensual** | Planificación mensual de pastoreo con oferta y demanda de recursos forrajeros. Incluye simulador de pastoreo. |
| **Recría y Engorde** | Registro de dietas de recría/engorde con bases nutricionales (MS, PB, FDN, FDA, DIVMS). Incluye cálculos de porciones y métricas. |
| **Balance Económico** | Registro de ingresos (type=0) y egresos (type=1) con fecha, evento, detalle y monto. |
| **Detalle de Ventas** | Detalle completo de ventas de animales con cálculos automáticos: kilos sucios, desbaste, kilos limpios, precio por kg, subtotal, IVA y total. Incluye estadísticas agregadas. |
| **Suministros** | CRUD de suministros generales asociados a lotes. |
| **Suministros Veterinarios** | CRUD de suministros veterinarios del establecimiento. |
| **Análisis Productivo** | Dashboard analítico con métricas de: stock actual por tipo de animal, movimientos, destetes, mortalidad e indicadores de eficiencia. |
| **Análisis Reproductivo** | Dashboard analítico con: tasas de preñez, diagnósticos por grupo (pre-servicio, ecografía, tacto), estados acumulados. El usuario puede ajustar valores base mediante configuraciones. |
| **Logs de Auditoría** | Registro de todas las acciones realizadas por el usuario, organizadas por módulo. |
| **Planes de Suscripción** | Visualización y selección de planes de pago. Integración con MercadoPago para procesamiento. |

---

## Rutas de la Aplicación

### Rutas Públicas (sin autenticación)

| Método | URI | Controlador / Acción | Descripción |
|---|---|---|---|
| GET | `/` | `HomeController@index` | Landing page pública |
| GET | `/politica-privacidad` | Vista directa | Página de Política de Privacidad |
| GET | `/auth` | `LoginController@showLoginForm` | Formulario de inicio de sesión |
| POST | `/login` | `LoginController@login` | Procesa el inicio de sesión |
| POST | `/register` | `RegisterController@register` | Registra un nuevo usuario |
| GET | `/login/verify/{email}` | `LoginController@verify` | Verificación de cuenta por email |
| GET | `/login/verify/resend/{email}` | `LoginController@resend` | Reenvío del código de verificación |
| GET | `/logout` | `LoginController@logout` | Cierra sesión |
| GET | `/plans` | `LoginController@plans` | Muestra los planes de suscripción |
| POST | `/plans/select/{id}` | `LoginController@selectPlan` | Selecciona un plan de pago |
| GET | `/payment/success` | `LoginController@paymentSuccess` | Callback de pago exitoso (MercadoPago) |
| GET | `/payment/pending` | `LoginController@paymentPending` | Callback de pago pendiente |
| GET | `/payment/failure` | `LoginController@paymentFailure` | Callback de pago fallido |
| GET | `/payment/callback` | `LoginController@paymentCallback` | Callback general de pago |
| ANY | `/webhook/mercadopago` | `PaymentController@handleWebhook` | Webhook de notificación de MercadoPago |

### Rutas Protegidas — Dashboard (`/dashboard/...`)

**Middleware:** `auth.verify` + `CheckSubscription`

**Recursos CRUD completos (Resource Routes):**

| Recurso | URI Base | Operaciones |
|---|---|---|
| Campos | `/dashboard/fields` | index, create, store, show, edit, update, destroy |
| Lotes | `/dashboard/batches` | index, create, store, show, edit, update, destroy |
| Rodeos | `/dashboard/rodeos` | index, create, store, show, edit, update, destroy |
| Stocks | `/dashboard/stocks` | index, create, store, show, edit, update, destroy |
| Pastoreos | `/dashboard/grazings` | index, create, store, show, edit, update, destroy |
| Pastoreo Mensual | `/dashboard/grazing-months` | CRUD completo |
| Suministros | `/dashboard/supplies` | CRUD completo |
| Toros | `/dashboard/bulls` | CRUD completo |
| Suministros Vet. | `/dashboard/veterinary-supplies` | CRUD completo |
| Pesajes de Rodeo | `/dashboard/herd-weighings` | solo index |
| Razones (Recría) | `/dashboard/reasons` | CRUD completo |
| Balances Económicos | `/dashboard/economic-balances` | CRUD completo |
| Recría/Engorde | `/dashboard/rearing-finishings` | CRUD completo |
| Detalle de Ventas | `/dashboard/balance-sales` | index, store, edit, update, destroy |

**Rutas especializadas:**

| Método | URI | Descripción |
|---|---|---|
| GET | `/dashboard/client` | Panel principal del usuario |
| GET | `/dashboard/export-stocks` | Exportar stocks a Excel |
| POST | `/dashboard/import-stocks` | Importar stocks desde Excel |
| GET | `/dashboard/export-reproductions` | Exportar reproducciones a Excel |
| POST | `/dashboard/import-reproductions` | Importar reproducciones desde Excel |
| GET | `/dashboard/transfer/stock/{id?}` | Transferir stock individual |
| GET | `/dashboard/transfer-all/stock` | Transferir stocks masivamente |
| PUT | `/dashboard/move/stock/{id?}` | Mover stock entre rodeos |
| GET | `/dashboard/stocks-reunion` | Vista de reunión de stocks |
| GET | `/dashboard/events/reproductions/list` | Vista de eventos reproductivos |
| GET | `/dashboard/events/weanings/list` | Vista de destetes |
| GET | `/dashboard/events/weanings/{id}/animals` | Detalle de animales del destete |
| GET | `/dashboard/events/sanitary/list` | Vista de eventos sanitarios |
| GET | `/dashboard/events/sanitary/calendar` | Calendario sanitario anual |
| GET/POST | `/dashboard/events/sanitary/calendar-codes` | Gestión de códigos del calendario |
| GET | `/dashboard/events/deaths/list` | Vista de muertes/ventas |
| GET | `/dashboard/events/feedings/list` | Vista de alimentación |
| GET | `/dashboard/events/logs/list` | Vista de logs de auditoría |
| GET | `/dashboard/events/logs/list/{id}` | Detalle de un log específico |
| GET | `/dashboard/analysis/productive` | Análisis productivo |
| GET | `/dashboard/analysis/reproductive` | Análisis reproductivo |
| POST | `/dashboard/analysis/update-born-last-year` | Actualizar nacidos año anterior |
| GET | `/dashboard/balance-sales/stats` | Estadísticas de ventas |
| GET | `/dashboard/grazing-months/simulator/index` | Simulador de pastoreo |
| GET | `/dashboard/grazing-months/resources/index` | Recursos de pastoreo |

### Rutas AJAX (datos dinámicos)

**Prefijo:** `/ajax/...`

| Categoría | Ejemplo de URI | Descripción |
|---|---|---|
| **Datos relacionados** | `ajax/get/fields/{id}` | Campos, rodeos, stocks, lotes por usuario |
| **Destetes** | `ajax/get/weanings/stocks` | Stocks disponibles para destete con pesos |
| **Catálogos** | `ajax/get/animal_breeds` | Razas, tipos de pastoreo, servicios, dietas, alimentos |
| **Recursos forrajeros** | `ajax/get/forage_resources/region/{id}` | Recursos forrajeros por región |
| **Métricas** | `ajax/get/monthly_totals` | Totales mensuales, métricas de recría |
| **Balance** | `ajax/get/total/balance/sale` | Totales de detalle de ventas |

### Rutas AJAX para DataTables

**Prefijo:** `/ajax/datatables/...`

Todas retornan datos paginados en formato JSON compatible con jQuery DataTables (server-side):

`get/fields/user`, `get/batches/user`, `get/rodeos/user`, `get/stocks/user`, `get/stocks-reunion/user`, `get/grazings/user`, `get/bulls/user`, `get/herd-weighings/user`, `get/reasons/user`, `get/economic-balances/user`, `get/rearing-finishings/user`, `get/balance-sales/user`, `get/supplies/user`, `get/veterinary-supplies/user`, `get/grazing-months-offer/user`, `get/grazing-months-demand/user`, `get/grazing-months-simulator/user`, `get/reproduction`, `get/sanitary`, `get/deaths`, `get/feedings`, `get/weanings`, `get/logs/module`.

### Rutas AJAX para Select2

**Prefijo:** `/ajax/select/...`

Búsquedas dinámicas con paginación:

| URI | Descripción |
|---|---|
| `search/rodeos/user` | Búsqueda de rodeos del usuario |
| `search/stocks/user` | Búsqueda de stocks del usuario |
| `search/stocks/rodeos/{id}` | Stocks filtrados por rodeo |
| `search/treatment-codes` | Búsqueda de códigos de tratamiento |

---

## Documentación de la API REST

**Middleware:** `auth.api` (Sanctum) + `plan.api`

| Método | URI | Controlador | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | `Api\AuthController@login` | Login con token (app móvil) |
| GET | `/api/data/user` | `Api\DatatablesController@getData` | Datos completos del usuario autenticado |
| POST | `/api/deaths` | `Api\EventController@deaths` | Crear evento de muerte (desde app) |
| POST | `/api/feedings` | `Api\EventController@feedings` | Crear evento de alimentación (desde app) |
| POST | `/api/sanitary` | `Api\EventController@sanitary` | Crear evento sanitario (desde app) |
| POST | `/api/reproductions` | `Api\EventController@reproductions` | Crear evento reproductivo (desde app) |
| POST | `/api/createStock` | `Api\StockController@create` | Crear stock nuevo (desde app) |
| GET | `/api/weanings` | `Api\WeaningController@index` | Listar destetes del usuario |
| GET | `/api/weanings/{id}` | `Api\WeaningController@show` | Detalle de un destete |
| GET | `/api/rodeos/{rodeoId}/stocks` | `Api\WeaningController@getStocksByRodeo` | Stocks de un rodeo (para destete) |

---

## Modelo de Datos

### Base de datos: `proganadero_client` (conexión `mysql`)

| Tabla | Descripción | Campos Clave |
|---|---|---|
| **users** | Usuarios registrados (UUID como PK) | `id`, `name`, `email`, `password` |
| **sessions** | Sesiones activas | `id`, `user_id`, `ip_address`, `last_activity` |
| **password_reset_tokens** | Tokens de recuperación | `email (PK)`, `token` |
| **modules** | Catálogo de módulos del sistema | `id (UUID)`, `name` |
| **logs** | Auditoría de acciones del usuario | `id (UUID)`, `user_id`, `module_id`, `description`, `ids (JSON)` |
| **reproductions** | Eventos reproductivos por animal | `id (UUID)`, `user_id`, `stock_id`, `type_reproduction`, `type_animal_id` + campos de Pre-servicio, Ecografía, Tacto, Parto, BRC, TBC |
| **sanitary** | Eventos sanitarios | `id (UUID)`, `user_id`, `stock_id`, `rodeo_id`, `treatment_code_id`, `date`, `type_sanitary`, `dose`, `mark` |
| **sanitary_month_codes** | Planificación sanitaria mensual | `id (UUID)`, `user_id`, `type_animal_id`, `month`, `codes (JSON)` |
| **deaths** | Muertes o ventas de animales | `id (UUID)`, `user_id`, `field_id`, `rodeo_id`, `stock_id`, `type_death`, `date`, `guide_number` |
| **feedings** | Pesaje/alimentación | `id (UUID)`, `user_id`, `rodeo_id`, `stock_id`, `date`, `weight` |
| **weanings** | Cabecera del destete | `id (UUID)`, `user_id`, `field_id`, `rodeo_id`, `date`, `quantity`, `total_kg` |
| **weaning_stocks** | Stocks incluidos en un destete | `id (UUID)`, `weaning_id`, `stock_id`, `type_animal_id`, `weight` |
| **weaning_animals** | Transformación de tipo de animal post-destete | `id (UUID)`, `weaning_id`, `stock_id`, `type_animal_id_before`, `type_animal_id_after`, `weight` |
| **grazings** | Movimientos de pastoreo | `id (UUID)`, `user_id`, `field_id`, `rodeo_id`, `rodeo_id_destiny`, `input_date`, `output_date` |
| **grazing_months** | Planificación mensual de pastoreo | `id (UUID)`, `user_id`, `field_id`, `batch_id`, `grazing_type_id`, `forage_resource_admin_id` |
| **economic_balances** | Ingresos y egresos | `id (UUID)`, `user_id`, `date`, `event`, `type (0=ingreso, 1=egreso)`, `detail`, `amount` |
| **balance_sales** | Detalle de ventas de animales | `id`, `user_id`, `date`, `buyer_name`, `type_animal_id`, `animals_count`, `kilos_dirty`, `kilos_clean`, `price_per_kg`, `subtotal`, `iva`, `total` |
| **rearing_finishing_bases_client** | Bases nutricionales del usuario | `id (UUID)`, `user_id`, `detail`, `type`, `ms`, `pb`, `fdn`, `fda`, `divms`, `price_per_kilo` |
| **rearing_finishings** | Dietas de recría/engorde | `id (UUID)`, `user_id`, `rodeo_id`, `portions`, `type`, `date` |
| **reasons** | Justificaciones de recría | `id (UUID)`, `user_id`, `rodeo_id`, `detail`, `reason_value` |
| **supplies** | Suministros generales | `id (UUID)`, `name`, `quantity`, `unit`, `date`, `batch_id` |
| **food_supplies** | Suministros alimenticios | `id (UUID)`, `name`, `quantity`, `unit`, `date`, `user_id` |
| **analysis_settings** | Configuraciones de análisis | `id`, `user_id`, `rodeo_id`, `field_id`, `key`, `value` |
| **bulls** | Examen de toros | `id (UUID)`, `user_id`, `stock_id` + campos de examen físico y sanitario |
| **herd_weighings** | Pesajes de rodeo | `id`, `rodeo_id` |

### Base de datos: `proganadero_admin` (conexión `mysql_admin`)

| Tabla | Descripción |
|---|---|
| **fields** | Campos/Establecimientos del productor |
| **batches** | Lotes dentro de un campo |
| **rodeos** | Rodeos dentro de un campo |
| **stocks** | Animales individuales (IDV, EID, campo, rodeo, lote, tipo, raza) |
| **type_animals** | Catálogo de tipos de animal (Vaca, Toro, Ternero, Vaquillona, etc.) |
| **animal_breeds** | Catálogo de razas (Angus, Hereford, etc.) |
| **treatment_codes** | Catálogo de códigos de tratamiento sanitario |
| **plans** | Planes de suscripción del sistema |
| **profiles** | Perfil del usuario con datos de plan, fechas de suscripción, país |
| **payment_orders** | Órdenes de pago generadas para MercadoPago |
| **payment_histories** | Historial de pagos confirmados |
| **forage_resources** | Recursos forrajeros del sistema |
| **regions** | Regiones geográficas |
| **countries** | Catálogo de países |

> **Nota:** Todas las tablas principales utilizan **UUID v4** como clave primaria en lugar de auto-increment, generado mediante el trait `CharIdTrait`.

---

## Lógica de Negocio Principal

### Sistema de Suscripción y Pagos (MercadoPago)

1. El usuario selecciona un plan desde `/plans`. Se genera una `PaymentOrder` con estado `initiated`.
2. Se crea una preferencia de pago en MercadoPago y se redirige al usuario.
3. MercadoPago redirige a `/payment/success`, `/payment/pending` o `/payment/failure`.
4. En paralelo, MercadoPago notifica al webhook `/webhook/mercadopago`, donde se actualiza el estado.
5. El middleware `CheckSubscription` verifica en cada request que el plan no haya expirado. Si expiró, envía correo vía Brevo (con caché de 30 días) y redirige a planes.

### Limitación de Vientres por Plan

El trait `StockPlanLimitTrait` controla la cantidad de animales tipo "Vaca" (vientres) según el plan de suscripción. Se valida tanto en la creación manual como en la importación masiva desde Excel.

### Importación y Exportación Excel

- **Exportación de Stocks:** Genera Excel con columnas IDV, EID, Campo, Lote, Rodeo, Tipo de Animal. Soporta filtros opcionales.
- **Importación de Stocks:** Lee fila por fila, detecta duplicados por IDV/EID, actualiza o inserta según corresponda. Valida pertenencia de rodeo/lote al campo y aplica límite de vientres.
- **Importación de Reproducciones:** Valida la "Regla de los 4 Campos" por grupo diagnóstico. Normaliza fechas con `DateNormalizerService`.

### Eventos en Tiempo Real (WebSockets)

El sistema utiliza **Laravel Reverb** para emitir eventos cuando se crean o modifican datos:

| Evento | Disparador |
|---|---|
| `UserDataChanged` | CRUD de stocks, reproducciones, sanitarios, muertes, alimentación |
| `StockCreated` | Creación de un nuevo stock |

---

## Estructura de Vistas (Front-end)

| Directorio / Archivo | Descripción |
|---|---|
| layouts/panel.blade.php | Layout del dashboard (sidebar + navbar) |
| layouts/public.blade.php | Layout páginas públicas |
| layouts/partials/navbar.blade.php | Navbar del panel |
| layouts/partials/sidebar.blade.php | Sidebar de navegación |
| layouts/partials/landing-navbar.blade.php | Navbar de la landing page |
| layouts/partials/landing-footer.blade.php | Footer de la landing page |
| layouts/partials/libs/ | Bootstrap, FontAwesome, etc. |
| layouts/partials/styles/ | CSS por módulo |
| layouts/partials/scripts/ | JS por módulo |
| dashboard.blade.php | Panel principal |
| welcome.blade.php | Landing page pública |
| politica-privacidad.blade.php | Política de privacidad |
| auth/ | Login y registro |
| stocks/ | CRUD de stocks |
| events/reproductions/ | Reproducciones |
| events/weanings/ | Destetes |
| events/sanitary/ | Sanitario + calendario |
| events/deaths/ | Muertes |
| events/feedings/ | Alimentación |
| events/logs/ | Logs de auditoría |
| fields/ | Campos |
| batches/ | Lotes |
| rodeos/ | Rodeos |
| bulls/ | Toros |
| grazings/ | Pastoreos |
| grazing_months/ | Pastoreo mensual + simulador |
| economicBalances/ | Balances económicos |
| balanceSales/ | Detalle de ventas |
| RearingFinishings/ | Recría y engorde |
| analysis/ | Análisis productivo/reproductivo |
| supplies/ | Suministros |
| veterinarySupplies/ | Suministros veterinarios |
| emails/ | Templates de correo (Brevo) |

### Componentes de UI Principales

| Componente | Tecnología | Uso |
|---|---|---|
| **DataTables** | jQuery DataTables (server-side AJAX) | Todas las tablas de datos del sistema |
| **Select2** | AJAX con paginación automática | Selectores de rodeos, stocks, códigos de tratamiento |
| **Modales** | Bootstrap 5 | Operaciones CRUD (crear, editar, ver) |
| **Notificaciones** | SweetAlert2 | Confirmaciones, mensajes de éxito/error, toasts con pausa on-hover |

---

## Controladores Principales

| Controlador | Tamaño | Responsabilidad |
|---|---|---|
| `EventController.php` | ~87 KB | Gestión de todos los eventos (reproducciones, sanitários, muertes, destetes, alimentación, logs) + import/export Excel |
| `AnalysisController.php` | ~60 KB | Análisis productivo y reproductivo con cálculos extensivos |
| `StockController.php` | ~40 KB | CRUD de stocks, transferencias, import/export Excel, validación de vientres |
| `GrazingMonthController.php` | ~26 KB | Pastoreo mensual, simulador, gestión de recursos forrajeros |
| `PaymentController.php` | ~23 KB | Webhook MercadoPago, procesamiento de pagos, gestión de órdenes |
| `BalanceSalesController.php` | ~18 KB | Detalle de ventas con cálculos económicos |
| `RearingFinishingController.php` | ~17 KB | Recría y engorde con bases nutricionales |

---

## Servicios Auxiliares

| Servicio | Descripción |
|---|---|
| **BrevoService** | Envío de correos transaccionales vía API de Brevo (verificación, expiración de plan, recuperación de contraseña) |
| **ExcelService** | Generación dinámica de archivos Excel con validaciones en listas desplegables |
| **DateNormalizerService** | Normalización de fechas desde Excel (serial, d/m/Y, Y-m-d) al formato estándar |
| **ExcludeByRelationService** | Filtrado de stocks ya asociados a otros registros para evitar duplicados |

---

## Traits Reutilizables

| Trait | Propósito |
|---|---|
| `ValidateFormTrait` | Validación centralizada de formularios con respuesta JSON estandarizada |
| `CharIdTrait` | Generación de UUIDs únicos verificados contra la tabla destino |
| `RuleArrayTrait` | Generación dinámica de reglas de validación para arrays de inputs |
| `LogTrait` | Registro de acciones en la tabla `logs` con módulo y datos asociados |
| `PregnancyCatalogTrait` | Catálogo de diagnósticos reproductivos y mapeo a estados (preñada/vacía) |
| `StockPlanLimitTrait` | Validación de límites de vientres según plan de suscripción |
| `StockIndexTrait` | Lógica de identificación de stocks (IDV/EID) |
| `ApiResponseTrait` | Formateo estandarizado de respuestas JSON para la API REST |
| `PlanRemenberTrait` | Lógica de recordatorio de plan para la interfaz |
| `GenerateCodeTrait` | Generación de códigos numéricos únicos (verificación por email) |

---

## Middleware del Sistema

| Middleware | Descripción |
|---|---|
| `VerifyAuth` | Verifica que exista un usuario autenticado en sesión |
| `CheckSubscription` | Valida plan activo. Si expiró, envía email y redirige a planes |
| `AuthenticateApiToken` | Valida token Sanctum para peticiones de la API |
| `CheckApiSubscription` | Verifica suscripción activa para peticiones de la API |

---

> **Nota:** Esta documentación fue generada a partir del análisis directo del código fuente del proyecto ProGanadero. Para detalles de implementación específicos, se recomienda consultar los archivos fuente referenciados en cada sección.
