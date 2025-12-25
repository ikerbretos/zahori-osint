import { spawn } from 'child_process';
import path from 'path';

interface PythonExecutionResult {
    success: boolean;
    stdout: string; // Ensure this is always string
    stderr: string; // Ensure this is always string
    error?: string;
}

export class PythonWorker {
    /**
     * Executes a Python script located in backend/tools
     * @param scriptRelativePath Path relative to backend/tools (e.g., "sherlock/sherlock.py")
     * @param args Array of arguments to pass to the script
     */
    async executeScript(scriptRelativePath: string, args: string[]): Promise<PythonExecutionResult> {
        return new Promise((resolve) => {
            const toolsDir = path.join(process.cwd(), 'tools'); // Assumes running from backend root
            const scriptPath = path.join(toolsDir, scriptRelativePath);

            console.log(`[PythonWorker] Executing: python ${scriptPath} ${args.join(' ')}`);

            const pythonProcess = spawn('python', [scriptPath, ...args], {
                cwd: toolsDir // Execute in tools dir so imports work if needed
            });

            let stdoutData = '';
            let stderrData = '';

            pythonProcess.stdout.on('data', (data) => {
                stdoutData += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                stderrData += data.toString();
            });

            pythonProcess.on('error', (error) => {
                console.error(`[PythonWorker] Spawn Error:`, error);
                resolve({
                    success: false,
                    stdout: stdoutData,
                    stderr: stderrData,
                    error: error.message
                });
            });

            pythonProcess.on('close', (code) => {
                console.log(`[PythonWorker] Finished with code ${code}`);
                if (code === 0) {
                    resolve({ success: true, stdout: stdoutData, stderr: stderrData });
                } else {
                    resolve({
                        success: false,
                        stdout: stdoutData,
                        stderr: stderrData,
                        error: `Process exited with code ${code}`
                    });
                }
            });

            // Timeout safety (2 minutes)
            setTimeout(() => {
                if (!pythonProcess.killed) {
                    pythonProcess.kill();
                    resolve({
                        success: false,
                        stdout: stdoutData,
                        stderr: stderrData + "\n[Timeout] Process killed after 120s",
                        error: "Timeout"
                    });
                }
            }, 120000);
        });
    }
}
