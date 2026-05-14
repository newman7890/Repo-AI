import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff, Sparkles, Gift } from "lucide-react";
import { saveDeviceInfo, notifyAdminNewUser } from "@/lib/device-info";
import { SEO } from "@/components/SEO";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref")?.toUpperCase().slice(0, 12) || "";
  const initialIsLogin = !refCode; // referrals land on signup

  const [isLogin, setIsLogin] = useState(initialIsLogin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const handledSignInsRef = useRef<Set<string>>(new Set());

  // Persist ref code so it survives email-confirmation redirect
  useEffect(() => {
    if (refCode) {
      try { localStorage.setItem("renderme_ref_code", refCode); } catch { /* ignore */ }
    }
  }, [refCode]);

  const runPostSignInSetup = async (userId: string, email?: string) => {
    if (handledSignInsRef.current.has(userId)) return;
    handledSignInsRef.current.add(userId);

    try { await saveDeviceInfo(userId, email); } catch (e) { console.error(e); }
    try { await notifyAdminNewUser(userId, email || "Unknown"); } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && event === "SIGNED_IN") {
        await runPostSignInSetup(session.user.id, session.user.email);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await runPostSignInSetup(data.user.id, data.user.email);
        toast.success("Welcome back!");
        navigate("/app");
      } else {
        const storedRef = (() => {
          try { return localStorage.getItem("renderme_ref_code") || refCode; } catch { return refCode; }
        })();
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: "https://renderme.site/app",
            data: storedRef ? { ref_code: storedRef } : undefined,
          },
        });
        if (error) throw error;
        toast.success("Check your email to verify your account!");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) { toast.error("Enter your email first"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://renderme.site/reset-password",
    });
    if (error) toast.error(error.message); else toast.success("Password reset email sent!");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-8">
      <SEO title="Sign in or Sign up" description="Sign in to Renderme AI to edit photos with AI, swap faces, and create stunning images." canonical="/auth" noindex />
      <div className="w-full max-w-md md:max-w-lg space-y-6 md:space-y-8 bg-card/40 md:border md:border-border/40 md:rounded-3xl md:p-10 md:shadow-2xl backdrop-blur-sm">
        <div className="text-center space-y-2 md:space-y-3">
          <div className="inline-flex items-center gap-2 md:gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-['Space_Grotesk']">
              Renderme AI
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
            {isLogin ? "Sign in to Renderme AI" : "Create your Renderme AI account"}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {isLogin ? "Sign in to continue" : "Start with 3 free AI photo edits"}
          </p>
        </div>

        {!isLogin && refCode && (
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 flex items-center gap-2 text-sm">
            <Gift className="w-4 h-4 text-primary shrink-0" />
            <span>You were invited! Code <span className="font-mono font-semibold">{refCode}</span> applied.</span>
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12 bg-secondary border-border/50" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm text-muted-foreground">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 h-12 bg-secondary border-border/50" required minLength={6} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isLogin && (
            <button type="button" onClick={handleForgotPassword} className="text-xs text-primary hover:underline">
              Forgot password?
            </button>
          )}

          <Button type="submit" className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90" disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline font-medium">
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>

        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
};

export default Auth;
