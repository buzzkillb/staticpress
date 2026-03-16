import { useState, useEffect } from 'react';

interface DeployButtonProps {
  className?: string;
}

export function DeployButton({ className = '' }: DeployButtonProps) {
  const [status, setStatus] = useState<'idle' | 'building' | 'deploying' | 'success' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [projectName, setProjectName] = useState('staticpress');

  useEffect(() => {
    const saved = localStorage.getItem('cf_project_name');
    if (saved) setProjectName(saved);
  }, []);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleDeploy = async () => {
    const apiToken = localStorage.getItem('cf_api_token');
    const accountId = localStorage.getItem('cf_account_id');
    const projName = localStorage.getItem('cf_project_name') || 'staticpress';

    if (!apiToken || !accountId) {
      setStatus('error');
      setLogs(['Error: Please configure your Cloudflare API token and Account ID first']);
      return;
    }

    setStatus('building');
    setLogs([]);
    addLog('Starting build process...');

    try {
      // Step 1: Build the site
      addLog('Building static site...');
      
      const buildRes = await fetch('/api/build', { 
        method: 'POST' 
      });
      
      const buildData = await buildRes.json();
      
      if (!buildData.success) {
        throw new Error(buildData.error || 'Build failed');
      }
      
      addLog('Build completed successfully!');
      setStatus('deploying');
      addLog('Deploying to Cloudflare Pages...');

      // Step 2: Deploy with wrangler
      const deployRes = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiToken,
          accountId,
          projectName: projName,
        }),
      });
      
      const deployData = await deployRes.json();
      
      if (deployData.success) {
        setStatus('success');
        addLog('Deployed successfully!');
        if (deployData.url) {
          addLog(`Live at: ${deployData.url}`);
        }
      } else {
        throw new Error(deployData.error || 'Deploy failed');
      }
    } catch (error: any) {
      setStatus('error');
      addLog(`Error: ${error.message}`);
    }
  };

  return (
    <div className={className}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Project Name
        </label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => {
            setProjectName(e.target.value);
            localStorage.setItem('cf_project_name', e.target.value);
          }}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="my-static-site"
        />
      </div>

      <button
        onClick={handleDeploy}
        disabled={status === 'building' || status === 'deploying'}
        className={`w-full px-6 py-3 rounded-lg font-medium transition-all ${
          status === 'idle' 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : status === 'building' || status === 'deploying'
            ? 'bg-yellow-500 text-white cursor-wait'
            : status === 'success'
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
        }`}
      >
        <span className="flex items-center justify-center gap-2">
          {status === 'idle' && (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Deploy to Cloudflare Pages
            </>
          )}
          {status === 'building' && (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Building...
            </>
          )}
          {status === 'deploying' && (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Deploying...
            </>
          )}
          {status === 'success' && (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Deployed!
            </>
          )}
          {status === 'error' && (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Failed - Try Again
            </>
          )}
        </span>
      </button>

      {logs.length > 0 && (
        <div className="mt-4 bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
          <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
            {logs.join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
}
