import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Compass, Eye, EyeOff, Loader2, MapPinned, Route, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { TourismBackdrop } from "@/components/TourismBackdrop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

const signInSchema = z.object({
  email: z.string().trim().email({ message: "Informe um e-mail válido." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
});

const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, { message: "Informe seu nome completo." }).max(100),
    email: z.string().trim().email({ message: "Informe um e-mail válido." }),
    password: z.string().min(8, { message: "Use pelo menos 8 caracteres." }).max(72),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

type SignInForm = z.infer<typeof signInSchema>;
type SignUpForm = z.infer<typeof signUpSchema>;
type AuthTab = "signin" | "signup";

const getRedirectPath = (state: unknown) => {
  if (typeof state !== "object" || state === null || !("from" in state)) return "/";
  const from = (state as { from?: { pathname?: unknown } }).from;
  const pathname = from?.pathname;

  return typeof pathname === "string" && pathname.startsWith("/") && !pathname.startsWith("//")
    ? pathname
    : "/";
};

const FieldError = ({ id, message }: { id: string; message?: string }) =>
  message ? (
    <p id={id} role="alert" className="text-sm font-medium text-destructive">
      {message}
    </p>
  ) : null;

export default function Auth() {
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = getRedirectPath(location.state);
  const [activeTab, setActiveTab] = useState<AuthTab>("signin");
  const [isLoadingSignIn, setIsLoadingSignIn] = useState(false);
  const [isLoadingSignUp, setIsLoadingSignUp] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  useEffect(() => {
    if (user) navigate(redirectPath, { replace: true });
  }, [navigate, redirectPath, user]);

  const signInForm = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    mode: "onTouched",
  });
  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    mode: "onTouched",
  });

  const onSignIn = async (data: SignInForm) => {
    setIsLoadingSignIn(true);
    try {
      const { error } = await signIn(data.email.trim(), data.password);
      if (error) {
        toast.error("E-mail ou senha incorretos.");
        return;
      }

      toast.success("Bem-vindo de volta!");
      navigate(redirectPath, { replace: true });
    } finally {
      setIsLoadingSignIn(false);
    }
  };

  const onSignUp = async (data: SignUpForm) => {
    setIsLoadingSignUp(true);
    try {
      const { error, session } = await signUp(data.email.trim(), data.password, data.fullName);
      if (error) {
        toast.error("Não foi possível criar a conta. Confira os dados e tente novamente.");
        return;
      }

      if (!session) {
        toast.success("Conta criada. Confira seu e-mail para confirmar o cadastro.");
        setActiveTab("signin");
        signInForm.setValue("email", data.email.trim());
        return;
      }

      toast.success("Conta criada com sucesso!");
      navigate(redirectPath, { replace: true });
    } finally {
      setIsLoadingSignUp(false);
    }
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-background">
      <h1 className="sr-only">Entrar ou criar conta no ExploraSC</h1>
      <TourismBackdrop />
      <div className="relative z-10 mx-auto grid min-h-dvh max-w-7xl items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <section className="hidden max-w-xl lg:block" aria-labelledby="auth-intro-title">
          <div className="mb-8 flex items-center gap-3 text-lg font-bold">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Compass className="h-6 w-6" aria-hidden="true" />
            </span>
            <span>Explora<span className="text-primary">SC</span></span>
          </div>
          <p className="eyebrow">Santa Catarina do seu jeito</p>
          <h2 id="auth-intro-title" className="mt-4 text-balance text-4xl font-bold tracking-tight text-foreground xl:text-5xl">
            Descubra lugares que combinam com a sua viagem.
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Conte o que você gosta, escolha uma região e receba um roteiro simples de explorar — com todos os pontos no mapa.
          </p>
          <ul className="mt-8 space-y-4 text-sm font-medium text-foreground">
            <li className="flex items-center gap-3"><MapPinned className="h-5 w-5 text-primary" aria-hidden="true" /> Destinos organizados e localizados</li>
            <li className="flex items-center gap-3"><Route className="h-5 w-5 text-primary" aria-hidden="true" /> Roteiros baseados nas suas preferências</li>
            <li className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" /> Acesso protegido pela sua conta</li>
          </ul>
        </section>

        <Card className="mx-auto w-full max-w-md border-border/80 bg-card/95 shadow-xl backdrop-blur-sm">
          <CardHeader className="space-y-3 px-5 pb-4 pt-6 text-center sm:px-7">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md lg:hidden">
              <Compass className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold">Comece a explorar</h2>
            <CardDescription className="text-base">
              Entre ou crie sua conta gratuita no ExploraSC.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-6 sm:px-7">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AuthTab)}>
              <TabsList className="mb-6 grid h-14 w-full grid-cols-2 rounded-xl bg-muted p-1">
                <TabsTrigger className="min-h-12 rounded-lg" value="signin">Entrar</TabsTrigger>
                <TabsTrigger className="min-h-12 rounded-lg" value="signup">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-5" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">E-mail</Label>
                    <Input id="signin-email" type="email" inputMode="email" autoComplete="email" placeholder="voce@exemplo.com" className="h-12" aria-invalid={Boolean(signInForm.formState.errors.email)} aria-describedby={signInForm.formState.errors.email ? "signin-email-error" : undefined} {...signInForm.register("email")} />
                    <FieldError id="signin-email-error" message={signInForm.formState.errors.email?.message} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Senha</Label>
                    <div className="relative">
                      <Input id="signin-password" type={showSignInPassword ? "text" : "password"} autoComplete="current-password" className="h-12 pr-12" aria-invalid={Boolean(signInForm.formState.errors.password)} aria-describedby={signInForm.formState.errors.password ? "signin-password-error" : undefined} {...signInForm.register("password")} />
                      <button type="button" className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" onClick={() => setShowSignInPassword((visible) => !visible)} aria-label={showSignInPassword ? "Ocultar senha" : "Mostrar senha"}>
                        {showSignInPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <FieldError id="signin-password-error" message={signInForm.formState.errors.password?.message} />
                  </div>

                  <Button type="submit" className="h-12 w-full" disabled={isLoadingSignIn}>
                    {isLoadingSignIn && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {isLoadingSignIn ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome completo</Label>
                    <Input id="signup-name" type="text" autoComplete="name" className="h-12" aria-invalid={Boolean(signUpForm.formState.errors.fullName)} aria-describedby={signUpForm.formState.errors.fullName ? "signup-name-error" : undefined} {...signUpForm.register("fullName")} />
                    <FieldError id="signup-name-error" message={signUpForm.formState.errors.fullName?.message} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <Input id="signup-email" type="email" inputMode="email" autoComplete="email" className="h-12" aria-invalid={Boolean(signUpForm.formState.errors.email)} aria-describedby={signUpForm.formState.errors.email ? "signup-email-error" : undefined} {...signUpForm.register("email")} />
                    <FieldError id="signup-email-error" message={signUpForm.formState.errors.email?.message} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <div className="relative">
                      <Input id="signup-password" type={showSignUpPassword ? "text" : "password"} autoComplete="new-password" className="h-12 pr-12" aria-invalid={Boolean(signUpForm.formState.errors.password)} aria-describedby={signUpForm.formState.errors.password ? "signup-password-error" : "signup-password-hint"} {...signUpForm.register("password")} />
                      <button type="button" className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" onClick={() => setShowSignUpPassword((visible) => !visible)} aria-label={showSignUpPassword ? "Ocultar senha" : "Mostrar senha"}>
                        {showSignUpPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {!signUpForm.formState.errors.password && <p id="signup-password-hint" className="text-sm text-muted-foreground">Use pelo menos 8 caracteres.</p>}
                    <FieldError id="signup-password-error" message={signUpForm.formState.errors.password?.message} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Confirmar senha</Label>
                    <Input id="signup-confirm-password" type={showSignUpPassword ? "text" : "password"} autoComplete="new-password" className="h-12" aria-invalid={Boolean(signUpForm.formState.errors.confirmPassword)} aria-describedby={signUpForm.formState.errors.confirmPassword ? "signup-confirm-password-error" : undefined} {...signUpForm.register("confirmPassword")} />
                    <FieldError id="signup-confirm-password-error" message={signUpForm.formState.errors.confirmPassword?.message} />
                  </div>

                  <Button type="submit" className="h-12 w-full" disabled={isLoadingSignUp}>
                    {isLoadingSignUp && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {isLoadingSignUp ? "Criando conta..." : "Criar conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
