import { useState, useEffect, useCallback, useRef } from "react";
import { WebContainer } from "@webcontainer/api"
import { TemplateFolder } from "@/modules/playground/lib/path-to-json";

interface UseWebContainerProps {
    templateData: TemplateFolder
}

interface UseWebContainerReturn {
    serverUrl: string | null;
    isLoading: boolean | null;
    error: string | null;
    instance: WebContainer | null;
    writeFileSync: (path: string, content: string) => Promise<void>;
    destroy: () => void;
    isReady: boolean;
}

export const useWebContainer = ({ templateData }: UseWebContainerProps): UseWebContainerReturn => {
    const [serverUrl, setServerUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [instance, setInstance] = useState<WebContainer | null>(null);
    const [isReady, setIsReady] = useState<boolean>(false);
    const isTornDown = useRef(false);
    const isInitializing = useRef(false);

    useEffect(() => {
        let mounted = true
        // The 'instance' state variable is stale (null) inside the cleanup function during the first render cycle.
        let containerRef: WebContainer | null = null; 

        async function initializeWebContainer() {
            // Prevent multiple initializations
            if (isInitializing.current || isTornDown.current) {
                return;
            }

            isInitializing.current = true;

            try {
                const webcontainerInstance = await WebContainer.boot()
                
                if (!mounted || isTornDown.current) {
                    // Only teardown if we successfully booted
                    try {
                        await webcontainerInstance.teardown();
                    } catch (e) {
                        console.error('Error during immediate teardown:', e);
                    }
                    return
                }

                containerRef = webcontainerInstance; // Capture for cleanup
                setInstance(webcontainerInstance)
                setIsReady(true);
                setIsLoading(false)
            } catch (err) {
                console.error('Failed to initialize WebContainer:', err);
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Failed to initialize WebContainer');
                    setIsLoading(false);
                }
            } finally {
                isInitializing.current = false;
            }
        }

        initializeWebContainer()

        return () => {
            mounted = false
            if (containerRef && !isTornDown.current) {
                isTornDown.current = true;
                // Delay teardown to allow any in-flight operations to complete
                setTimeout(() => {
                    try {
                        containerRef?.teardown();
                    } catch (e) {
                        console.error('Error during cleanup teardown:', e);
                    }
                }, 100);
            }
        }
    }, [])

    const writeFileSync = useCallback(async (path: string, content: string): Promise<void> => {
        if (!instance || isTornDown.current) {
            throw new Error('WebContainer instance is not available');
        }

        try {
            const pathParts = path.split("/")
            const folderPath = pathParts.slice(0, -1).join("/")
            if (folderPath) {
                await instance.fs.mkdir(folderPath, { recursive: true });
            }
            await instance.fs.writeFile(path, content)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to write file';
            console.error(`Failed to write file at ${path}:`, err);
            throw new Error(`Failed to write file at ${path}: ${errorMessage}`);
        }
    }, [instance])

    const destroy = useCallback(() => {
        if (instance && !isTornDown.current) {
            isTornDown.current = true;
            try {
                instance.teardown();
            } catch (e) {
                console.error('Error during manual teardown:', e);
            }
            setInstance(null);
            setServerUrl(null);
            setIsReady(false);
        }
    }, [instance])
    
    return { serverUrl, isLoading, error, instance, writeFileSync, destroy, isReady };
}