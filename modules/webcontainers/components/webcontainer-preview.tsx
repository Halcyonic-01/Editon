"use client";
import React, { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { transformToWebContainerFormat } from "../hooks/transformer";
import { CheckCircle, Loader2, XCircle, RefreshCw, TerminalSquare } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

import { WebContainer } from "@webcontainer/api";
import { TemplateFolder } from "@/modules/playground/lib/path-to-json";

const TerminalComponent = dynamic(() => import("./terminal"), { 
  ssr: false,
  loading: () => <div className="h-full bg-zinc-950/50 rounded-lg animate-pulse" />
});

interface WebContainerPreviewProps {
  templateData: TemplateFolder;
  serverUrl: string;
  isLoading: boolean;
  error: string | null;
  instance: WebContainer | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  forceResetup?: boolean;
}

const WebContainerPreview = ({
  templateData,
  error: parentError,
  instance,
  isLoading: parentLoading,
  serverUrl,
  writeFileSync,
  forceResetup = false,
}: WebContainerPreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 4;
  
  // Combine internal setup errors with parent errors
  const [internalError, setInternalError] = useState<string | null>(null);
  const displayError = parentError || internalError;

  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isSetupInProgress, setIsSetupInProgress] = useState(false);

  const terminalRef = useRef<any>(null);

  // Reset state if forceResetup is triggered
  useEffect(() => {
    if (forceResetup) {
      setIsSetupComplete(false);
      setIsSetupInProgress(false);
      setPreviewUrl("");
      setInternalError(null);
      setCurrentStep(0);
    }
  }, [forceResetup]);

  useEffect(() => {
    async function setupContainer() {
      // 1. Basic Validation
      if (!instance || isSetupComplete || isSetupInProgress) return;
      
      // 2. Prevent race conditions if parent is still loading
      if (parentLoading) return;

      setIsSetupInProgress(true);
      setInternalError(null);

      try {
        // --- CHECK RECONNECT ---
        let isReconnecting = false;
        try {
          const packageJsonExists = await instance.fs.readFile("package.json", "utf8");
          if (packageJsonExists && !forceResetup) {
            isReconnecting = true;
            terminalRef.current?.writeToTerminal("🔄 Files detected. Reconnecting session...\r\n");
          }
        } catch (e) { /* ignore, file doesn't exist */ }

        if (isReconnecting) {
          // Just attach listener and finish
           instance.on("server-ready", (port, url) => {
             terminalRef.current?.writeToTerminal(`🌐 Server ready at ${url}\r\n`);
             setPreviewUrl(url);
           });
           setIsSetupComplete(true);
           setIsSetupInProgress(false);
           return;
        }

        // --- STEP 1: PREPARE FILES ---
        setCurrentStep(1);
        terminalRef.current?.writeToTerminal("📦 Preparing file system...\r\n");
        
        // @ts-ignore
        const files = transformToWebContainerFormat(templateData);
        
        // --- STEP 2: MOUNT ---
        setCurrentStep(2);
        await instance.mount(files);
        terminalRef.current?.writeToTerminal("✅ File system mounted.\r\n");

        // --- STEP 3: INSTALL ---
        setCurrentStep(3);
        terminalRef.current?.writeToTerminal("📥 Installing dependencies... (this may take a moment)\r\n");

        // We use --no-optional and --legacy-peer-deps to reduce crashes
        // We delete package-lock.json first to avoid platform mismatches
        try {
            await instance.fs.rm('package-lock.json');
            terminalRef.current?.writeToTerminal("   (removed existing package-lock.json to ensure compatibility)\r\n");
        } catch (e) { /* ignore */ }

        const installProcess = await instance.spawn("npm", ["install", "--no-optional", "--legacy-peer-deps"]);
        
        // Pipe output to terminal
        installProcess.output.pipeTo(new WritableStream({
          write(data) { terminalRef.current?.writeToTerminal(data); }
        }));

        const installExitCode = await installProcess.exit;

        if (installExitCode !== 0) {
          // SOFT FAIL: Don't crash the whole UI. Just log error and let user debug in terminal.
          const msg = `❌ npm install failed with code ${installExitCode}. See terminal for details.`;
          terminalRef.current?.writeToTerminal(`\r\n${msg}\r\n`);
          terminalRef.current?.writeToTerminal("⚠️ You can try running 'npm install' manually in this terminal.\r\n");
          
          setInternalError(msg); 
          setIsSetupComplete(true); // Mark complete so we stop spinner
          setIsSetupInProgress(false);
          return; // Stop here, don't try to run dev
        }
        
        terminalRef.current?.writeToTerminal("✅ Dependencies installed.\r\n");

        // --- STEP 4: START SERVER ---
        setCurrentStep(4);
        
        // Smart detect start command
        let startCommand = "start";
        try {
            const pkgRaw = await instance.fs.readFile("package.json", "utf8");
            const pkg = JSON.parse(pkgRaw);
            if (pkg.scripts && pkg.scripts.dev) startCommand = "dev";
        } catch (e) { 
            terminalRef.current?.writeToTerminal("⚠️ Could not read package.json scripts, defaulting to 'npm start'\r\n");
        }

        terminalRef.current?.writeToTerminal(`🚀 Starting server with 'npm run ${startCommand}'...\r\n`);

        const startProcess = await instance.spawn("npm", ["run", startCommand]);

        instance.on("server-ready", (port, url) => {
          terminalRef.current?.writeToTerminal(`✨ Server ready: ${url}\r\n`);
          setPreviewUrl(url);
        });

        startProcess.output.pipeTo(new WritableStream({
          write(data) { terminalRef.current?.writeToTerminal(data); }
        }));

        setIsSetupComplete(true);
        setIsSetupInProgress(false);

      } catch (err: any) {
        console.error("WebContainer Setup Error:", err);
        const msg = err.message || "Unknown error during setup";
        setInternalError(msg);
        terminalRef.current?.writeToTerminal(`\r\n❌ Fatal Error: ${msg}\r\n`);
        setIsSetupInProgress(false);
        setIsSetupComplete(true); // Stop spinner to show error state
      }
    }

    setupContainer();
  }, [instance, templateData, isSetupComplete, isSetupInProgress, parentLoading, forceResetup]);


  // --- RENDER HELPERS ---

  if (parentLoading && !instance) {
     return (
      <div className="h-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center space-y-4 max-w-md p-6">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Booting WebContainer...</p>
        </div>
      </div>
    );
  }

  // Determine Layout: 
  // If we have a preview URL, split screen.
  // If no URL yet (loading or error), show Status + Terminal full height.
  
  return (
    <div className="h-full w-full flex flex-col bg-zinc-950">
      
      {/* 1. PREVIEW AREA (IF READY) */}
      {previewUrl ? (
        <div className="flex-1 min-h-0 bg-white">
          <iframe
            src={previewUrl}
            className="w-full h-full border-none"
            title="Application Preview"
          />
        </div>
      ) : (
        /* 2. LOADING / ERROR STATE AREA */
        <div className="flex-none p-6 border-b border-border bg-zinc-900">
           <div className="max-w-2xl mx-auto w-full space-y-6">
              
              {/* Status Header */}
              <div className="flex items-center justify-between">
                 <h3 className="text-sm font-medium text-zinc-100 flex items-center gap-2">
                    {displayError ? <XCircle className="text-red-500 h-4 w-4"/> : <Loader2 className="animate-spin text-blue-500 h-4 w-4"/>}
                    {displayError ? "Setup Failed" : "Setting up environment..."}
                 </h3>
                 {displayError && (
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="h-8">
                       <RefreshCw className="h-3 w-3 mr-2"/> Retry
                    </Button>
                 )}
              </div>

              {/* Error Message (if any) */}
              {displayError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-xs font-mono break-all">
                     {displayError}
                  </div>
              )}

              {/* Progress Steps (Only show if no error to reduce noise, or keep for context) */}
              {!displayError && (
                 <div className="space-y-2">
                    <Progress value={(currentStep / totalSteps) * 100} className="h-1" />
                    <div className="flex justify-between text-xs text-zinc-500 font-mono">
                       <span>Initialize</span>
                       <span className={currentStep >= 2 ? "text-blue-400" : ""}>Mount</span>
                       <span className={currentStep >= 3 ? "text-blue-400" : ""}>Install</span>
                       <span className={currentStep >= 4 ? "text-blue-400" : ""}>Start</span>
                    </div>
                 </div>
              )}
           </div>
        </div>
      )}

      {/* 3. TERMINAL AREA - ALWAYS VISIBLE */}
      <div className={previewUrl ? "h-64 border-t border-border" : "flex-1 min-h-0"}>
         <div className="h-full flex flex-col">
            {/* Small Terminal Header */}
            <div className="flex items-center px-4 py-2 bg-zinc-900 border-b border-zinc-800">
               <TerminalSquare className="h-3 w-3 text-zinc-400 mr-2" />
               <span className="text-xs text-zinc-400 font-mono uppercase tracking-wider">Terminal Output</span>
            </div>
            <div className="flex-1 bg-zinc-950 p-2 overflow-hidden">
               <TerminalComponent
                 ref={terminalRef}
                 webContainerInstance={instance}
                 theme="dark"
                 className="h-full"
               />
            </div>
         </div>
      </div>
    </div>
  );
};

export default WebContainerPreview;