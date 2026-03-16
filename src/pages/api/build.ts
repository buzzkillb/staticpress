import { execSync } from 'child_process';

export const POST = async () => {
  try {
    execSync('bun run build:static', { 
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
