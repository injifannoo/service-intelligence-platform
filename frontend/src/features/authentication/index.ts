/**
 * Public API surface for the authentication slice.
 *
 * Per docs/07_Project_Structure.md:219, features are consumed exclusively
 * through this barrel. Deep imports into `features/authentication/*` from
 * outside the slice are an architectural violation.
 */
export { LoginForm } from "./components/login-form";
export { ProfilePanel } from "./components/profile-panel";
export { RegisterForm } from "./components/register-form";

export { authApi } from "./api/auth";
export {
  authKeys,
  useCurrentUser,
  useLogin,
  useLogout,
  useRegister,
} from "./api/use-auth";

export { useAuthUiStore } from "./store/auth-store";

export type {
  LoginResponse,
  RegisterInput,
  RegisterResponse,
  Session,
} from "./types";
