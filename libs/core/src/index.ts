export {
  BaseAuthService,
  AUTH_API_ENDPOINTS,
  AUTH_DEFAULT_SKIP_URLS,
} from './lib/auth/base-auth.service';
export type { AuthApiEndpoints } from './lib/auth/base-auth.service';
export { authGuard } from './lib/guards/auth.guard';
export { publicGuard } from './lib/guards/public.guard';
export { authInterceptor } from './lib/interceptors/auth.interceptor';
export { errorInterceptor } from './lib/interceptors/error.interceptor';
export { ERROR_TOAST } from './lib/interceptors/error-http-context';
export { tenantInterceptor } from './lib/interceptors/tenant.interceptor';
export type { PaginatedResponse } from './lib/models/pagination.model';
export type {
  BaseUsuario,
  Usuario,
  LoginRequest,
  AuthResponse,
  ResendVerificationRequest,
  RegisterRequest,
  RegisteredUser,
  RegisterResponse,
} from './lib/models/auth.model';
export { BaseHttpService, buildHttpParams } from './lib/services/base-http.service';
export type { ParamValue, RequestOptions } from './lib/services/base-http.service';
export { FileDownloadService } from './lib/http/file-download.service';
export type { FileDownloadOptions } from './lib/http/file-download.service';
export { parseFilename, triggerBrowserDownload } from './lib/http/file-download.utils';
export { CiudadService } from './lib/services/ciudad.service';
export type { Ciudad } from './lib/models/ciudad.model';
export { IdentificacionService } from './lib/services/identificacion.service';
export type { Identificacion } from './lib/models/identificacion.model';
export { TokenRefreshService } from './lib/services/token-refresh.service';
export { ToastService } from './lib/services/toast.service';
export { UserAvatarService } from './lib/services/user-avatar.service';
export { ReddocPreset } from './lib/theme/reddoc-preset';
export {
  ENVIRONMENT,
  CURRENT_APP,
  ROUTE_PATHS_TOKEN,
  AUTH_SERVICE,
  AUTH_SKIP_URLS,
  APP_BRANDING,
} from './lib/tokens';
export type {
  ReddocEnvironment,
  ReddocAppId,
  RoutePaths,
  AuthServiceContract,
  AppBranding,
} from './lib/tokens';
export {
  extractErrorMessage,
  isUnverifiedAccountError,
  parseApiError,
} from './lib/utils/error.utils';
export { getInitials } from './lib/utils/string.utils';
export {
  startOfToday,
  toIsoDate,
  fromIsoDate,
  toHora,
  fromHora,
  daysBetween,
  addDays,
  formatHorario,
  anioMesDeIso,
  diasDelMes,
  INICIALES_DIA_SEMANA_ES,
} from './lib/utils/date.utils';
export type { DiaDelMes, AnioMes } from './lib/utils/date.utils';
export { formatCop, toFiniteNumber } from './lib/utils/currency.utils';
export { redondearMoneda, calcularImpuestosLinea, calcularResumen } from './lib/calculo';
export type { TasaImpuesto, ImpuestoLinea, LineaCalculo, ResumenDocumento } from './lib/calculo';
export type {
  DocumentoListRowBase,
  DocumentoEstados,
  DocumentoReadBase,
  DocumentoPayloadBase,
  DocumentoDetalleReadBase,
  DocumentoDetallePayloadBase,
  DocumentoDetalleImpuestoRead,
} from './lib/documento';
export {
  DOCUMENT_TYPE_ID,
  ENTITY_DATA_GATEWAY,
  HttpEntityDataGateway,
  DocumentoDetalleService,
} from './lib/documento';
export type {
  EntityKind,
  InventoryEffect,
  DocumentCapabilities,
  EditableRowContext,
  EntityRoutes,
  ImportDescriptor,
  DocumentEntityConfig,
  EntityConfig,
  ModuleConfig,
  DocumentTypeId,
  DocumentTypeKey,
  EntityDataGateway,
} from './lib/documento';
export {
  toProgramacionFecha,
  esColumnaFestiva,
  esColumnaSabado,
  FestivoService,
} from './lib/calendario';
export type { ProgramacionFecha, Festivo } from './lib/calendario';
export type { ApiError, ApiErrorResponse } from './lib/utils/error.utils';
export { ForbiddenPageStore } from './lib/errors/forbidden-page.store';
export {
  I18nService,
  provideI18n,
  SUPPORTED_LANGS,
  DEFAULT_LANG,
  REDDOC_PRIMENG_ES,
} from './lib/i18n';
export type { Lang } from './lib/i18n';
export {
  TenantService,
  tenantGuard,
  tenantAccessGuard,
  tenantSlugMatchGuard,
  clearTenantGuard,
  rootRedirectGuard,
  TENANT_SCOPED,
  LAST_TENANT_KEY,
  TENANT_ROUTES,
  ContenedorService,
} from './lib/tenant';
export type {
  TenantSlug,
  ContenedorAccess,
  TenantRoutes,
  UpdateContenedorRequest,
  Contenedor,
  ContenedorRol,
  ContenedorMember,
  ContenedorMembersResponse,
  ContenedorInvitacionEstado,
  ContenedorInvitacionPendiente,
  ContenedorInvitacionesPendientesResponse,
  SendInviteRequest,
  GrupoSeguridad,
  PermisoAsignado,
  UsuarioPermiso,
  UsuarioClientePermiso,
  ContenedoresResponse,
  CreateContenedorRequest,
  UserSearchResult,
} from './lib/tenant';
export { ErpSelectDataService, SELECT_ENDPOINTS } from './lib/data';
export type { ErpSelectOption } from './lib/data';
export * from './lib/data-list';
export * from './lib/plans';
export { normalizeHttpError, classifyStatus, NON_FIELD_KEY } from './lib/utils/error-normalizer';
export type { NormalizedError, ApiErrorKind } from './lib/utils/error-normalizer';
export { applyServerErrors, clearServerError } from './lib/utils/form-errors';
export type { ServerFieldMap, ApplyServerErrorsResult } from './lib/utils/form-errors';
export { FormErrorService } from './lib/services/form-error.service';
