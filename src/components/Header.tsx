import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bookmark, Coins, Compass, Globe, Loader2, LogOut, Plus } from 'lucide-react';
import { CreditsDialog } from '@/components/CreditsDialog';
import { toast } from 'sonner';
import { useCredits } from '@/features/credits/useCredits';

export const Header = () => {
  const { credits, error, refresh } = useCredits();
  const [creditsOpen, setCreditsOpen] = useState(false);
  useEffect(() => {
    const open = () => setCreditsOpen(true);
    window.addEventListener('open-credits', open);
    return () => window.removeEventListener('open-credits', open);
  }, []);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    const { error } = await signOut();
    setIsSigningOut(false);

    if (error) {
      toast.error('Não foi possível sair. Tente novamente.');
      return;
    }

    navigate('/auth', { replace: true });
  };

  return (
    <header className="app-header fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-lg">
      <a href="#main-content" className="absolute left-4 top-2 z-[60] -translate-y-20 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background transition-transform focus:translate-y-0">
        Ir para o conteúdo principal
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/planejar" className="flex min-h-11 items-center gap-2.5 rounded-lg text-lg font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Compass className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>Explora<span className="text-primary">SC</span></span>
        </Link>

        <nav className="primary-nav" aria-label="Navegação principal">
          <NavLink to="/planejar"><Compass className="h-4 w-4" aria-hidden="true" />Planejar</NavLink>
          <NavLink to="/meus-roteiros"><Bookmark className="h-4 w-4" aria-hidden="true" />Meus roteiros</NavLink>
          <NavLink to="/comunidade"><Globe className="h-4 w-4" aria-hidden="true" />Comunidade</NavLink>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
        <Button type="button" variant="ghost" onClick={() => setCreditsOpen(true)} aria-haspopup="dialog" aria-label={credits ? `${credits.balance} créditos. Obter créditos` : 'Obter créditos'} className="h-11 gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 text-primary hover:bg-primary/10 sm:px-4"><Coins aria-hidden="true" /><span className="tabular-nums">{credits?.balance ?? '—'}</span><span className="hidden sm:inline">{credits?.balance === 1 ? 'crédito' : 'créditos'}</span><Plus className="!h-3.5 !w-3.5 opacity-60" aria-hidden="true" /></Button>
        <CreditsDialog open={creditsOpen} onClose={() => setCreditsOpen(false)} credits={credits} error={error} onRetry={refresh} />
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-11 w-11 rounded-full" aria-label="Abrir menu da conta">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="product-ui account-menu" align="end">
            <DropdownMenuLabel className="px-3 py-2.5">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Minha Conta</p>
                <p className="break-all text-xs leading-relaxed text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuItem asChild className="min-h-11 cursor-pointer">
              <Link to="/meus-roteiros"><Bookmark className="mr-2 h-4 w-4" aria-hidden="true" />Meus roteiros</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="min-h-11 cursor-pointer">
              <Link to="/comunidade"><Globe className="mr-2 h-4 w-4" aria-hidden="true" />Comunidade</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isSigningOut}
              onSelect={(event) => {
                event.preventDefault();
                void handleSignOut();
              }}
              className="min-h-11 cursor-pointer text-destructive focus:text-destructive"
            >
              {isSigningOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
              <span>{isSigningOut ? 'Saindo...' : 'Sair'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
