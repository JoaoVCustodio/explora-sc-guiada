import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InteractiveTourismBackground } from '@/components/InteractiveTourismBackground';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';

const signInSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }),
});

const signUpSchema = z.object({
  fullName: z.string().min(2, { message: 'Nome deve ter no mínimo 2 caracteres' }),
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }),
});

type SignInForm = z.infer<typeof signInSchema>;
type SignUpForm = z.infer<typeof signUpSchema>;

export default function Auth() {
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const [isLoadingSignIn, setIsLoadingSignIn] = useState(false);
  const [isLoadingSignUp, setIsLoadingSignUp] = useState(false);

  const {
    register: registerSignIn,
    handleSubmit: handleSubmitSignIn,
    formState: { errors: errorsSignIn },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
  });

  const {
    register: registerSignUp,
    handleSubmit: handleSubmitSignUp,
    formState: { errors: errorsSignUp },
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
  });

  const onSignIn = async (data: SignInForm) => {
    setIsLoadingSignIn(true);
    await signIn(data.email, data.password);
    setIsLoadingSignIn(false);
  };

  const onSignUp = async (data: SignUpForm) => {
    setIsLoadingSignUp(true);
    await signUp(data.email, data.password, data.fullName);
    setIsLoadingSignUp(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <InteractiveTourismBackground />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl bg-background/95 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Explora SC</CardTitle>
            <CardDescription>Seu guia de turismo personalizado em Santa Catarina</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSubmitSignIn(onSignIn)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="seu@email.com"
                      {...registerSignIn('email')}
                    />
                    {errorsSignIn.email && (
                      <p className="text-sm text-destructive">{errorsSignIn.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Senha</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      {...registerSignIn('password')}
                    />
                    {errorsSignIn.password && (
                      <p className="text-sm text-destructive">{errorsSignIn.password.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={isLoadingSignIn}>
                    {isLoadingSignIn ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSubmitSignUp(onSignUp)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome Completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="João Silva"
                      {...registerSignUp('fullName')}
                    />
                    {errorsSignUp.fullName && (
                      <p className="text-sm text-destructive">{errorsSignUp.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      {...registerSignUp('email')}
                    />
                    {errorsSignUp.email && (
                      <p className="text-sm text-destructive">{errorsSignUp.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      {...registerSignUp('password')}
                    />
                    {errorsSignUp.password && (
                      <p className="text-sm text-destructive">{errorsSignUp.password.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={isLoadingSignUp}>
                    {isLoadingSignUp ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      'Criar Conta'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
