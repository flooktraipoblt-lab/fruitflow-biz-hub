import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, Check, Zap, Shield, Wifi } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      toast({
        title: "ไม่สามารถติดตั้งได้",
        description: "กรุณาเปิดเว็บไซต์ผ่านเบราว์เซอร์บนมือถือ",
      });
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      toast({
        title: "ติดตั้งสำเร็จ! 🎉",
        description: "Fruit Flow พร้อมใช้งานบนหน้าจอหลักแล้ว",
      });
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const features = [
    {
      icon: Zap,
      title: "เร็วและลื่นไหล",
      description: "เปิดแอปได้ทันทีไม่ต้องรอโหลด"
    },
    {
      icon: Wifi,
      title: "ใช้งานได้แบบออฟไลน์",
      description: "เข้าถึงข้อมูลได้แม้ไม่มีอินเทอร์เน็ต"
    },
    {
      icon: Shield,
      title: "ปลอดภัย",
      description: "ข้อมูลของคุณถูกเข้ารหัสอย่างปลอดภัย"
    },
    {
      icon: Smartphone,
      title: "เหมือนแอปจริง",
      description: "ประสบการณ์การใช้งานเหมือนแอปพลิเคชันเนทีฟ"
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <Helmet>
        <title>ติดตั้งแอป | Fruit Flow</title>
        <meta name="description" content="ติดตั้ง Fruit Flow บนมือถือของคุณเพื่อประสบการณ์การใช้งานที่ดีที่สุด" />
      </Helmet>

      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-[hsl(var(--brand-1))] via-[hsl(var(--brand-2))] to-[hsl(var(--brand-3))] animate-scale-in">
          <Download className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold">ติดตั้ง Fruit Flow</h1>
        <p className="text-muted-foreground">เพิ่มแอปลงในหน้าจอหลักของคุณเพื่อการเข้าถึงที่รวดเร็ว</p>
      </div>

      {isInstalled ? (
        <Card className="smooth-shadow border-[hsl(var(--positive))]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Check className="h-6 w-6 text-[hsl(var(--positive))]" />
              <CardTitle>ติดตั้งสำเร็จแล้ว!</CardTitle>
            </div>
            <CardDescription>
              Fruit Flow พร้อมใช้งานบนหน้าจอหลักของคุณแล้ว
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="smooth-shadow">
          <CardHeader>
            <CardTitle>วิธีติดตั้ง</CardTitle>
            <CardDescription>
              เลือกวิธีที่เหมาะกับอุปกรณ์ของคุณ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isInstallable ? (
              <div className="space-y-4">
                <Button 
                  onClick={handleInstall} 
                  size="lg" 
                  className="w-full gap-2 bg-gradient-to-r from-[hsl(var(--brand-1))] via-[hsl(var(--brand-2))] to-[hsl(var(--brand-3))] hover:opacity-90"
                >
                  <Download className="h-5 w-5" />
                  ติดตั้งตอนนี้
                </Button>
                <p className="text-sm text-center text-muted-foreground">
                  กดปุ่มด้านบนเพื่อติดตั้งแอปทันที
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  <h3 className="font-medium">สำหรับ iPhone/iPad:</h3>
                  <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                    <li>กดปุ่ม แชร์ (Share) <span className="inline-block">📤</span></li>
                    <li>เลือก "เพิ่มไปยังหน้าจอหลัก" (Add to Home Screen)</li>
                    <li>กด "เพิ่ม" (Add)</li>
                  </ol>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <h3 className="font-medium">สำหรับ Android:</h3>
                  <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                    <li>กดปุ่มเมนู (⋮) ที่มุมบนขวา</li>
                    <li>เลือก "เพิ่มไปยังหน้าจอหลัก" หรือ "Install app"</li>
                    <li>กด "ติดตั้ง" (Install)</li>
                  </ol>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <Card key={index} className="smooth-shadow hover-scale">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-[hsl(var(--brand-1))] via-[hsl(var(--brand-2))] to-[hsl(var(--brand-3))]">
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {feature.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
