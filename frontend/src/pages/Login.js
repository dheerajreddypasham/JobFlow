import { motion } from 'framer-motion';
import { Briefcase, Target, TrendingUp, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';

export const Login = () => {
  const handleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1766330977451-de1b64b5e641?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwd29ya3NwYWNlJTIwZGVzayUyMHNldHVwJTIwemVufGVufDB8fHx8MTc3MTM3NTE0Mnww&ixlib=rb-4.1.0&q=85")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#064E3B]/90 to-stone-900/80"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-lg w-full"
        >
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-block p-4 bg-white/10 backdrop-blur-xl rounded-2xl mb-6"
            >
              <Briefcase className="w-12 h-12 text-white" strokeWidth={1.5} />
            </motion.div>
            <h1 className="text-5xl md:text-6xl font-medium tracking-tighter text-white mb-4">
              JobFlow
            </h1>
            <p className="text-xl text-white/80 leading-relaxed">
              Your personal copilot for a successful job search
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white/95 backdrop-blur-xl rounded-xl p-8 shadow-2xl border border-white/40"
          >
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-[#ECFDF5] rounded-lg">
                  <Target className="w-5 h-5 text-[#064E3B]" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-medium text-stone-900 mb-1">Stay Organized</h3>
                  <p className="text-sm text-stone-600">Track every application from discovery to offer</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-[#FFFBEB] rounded-lg">
                  <TrendingUp className="w-5 h-5 text-[#D97706]" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-medium text-stone-900 mb-1">Build Momentum</h3>
                  <p className="text-sm text-stone-600">Daily goals and tasks keep you moving forward</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-[#F5F5F4] rounded-lg">
                  <Sparkles className="w-5 h-5 text-[#064E3B]" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-medium text-stone-900 mb-1">AI Assistant</h3>
                  <p className="text-sm text-stone-600">Get match scores, cover letters, and email drafts</p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleLogin}
              data-testid="google-login-button"
              className="w-full rounded-full px-8 py-6 bg-[#064E3B] text-white hover:bg-[#064E3B]/90 hover:-translate-y-0.5 transition-all shadow-lg shadow-[#064E3B]/20 text-base font-medium"
            >
              Continue with Google
            </Button>

            <p className="text-xs text-center text-stone-500 mt-4">
              Secure authentication powered by Emergent
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
