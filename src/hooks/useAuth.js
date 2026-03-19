const { useState } = React;

export function useAuth(API_BASE) {
  const [canMigrate, setCanMigrate] = useState(true);
  const [permissionReason, setPermissionReason] = useState('');
  const [proxmoxTokenId, setProxmoxTokenId] = useState('');
  const [proxmoxTokenSecret, setProxmoxTokenSecret] = useState('');
  const [validatingToken, setValidatingToken] = useState(false);
  const [tokenValidationResult, setTokenValidationResult] = useState(null);
  const [tokenAuthError, setTokenAuthError] = useState(false);

  const checkPermissions = async () => {
    try {
      const response = await fetch(`${API_BASE}/permissions`);
      const result = await response.json();
      if (result.success) {
        setCanMigrate(result.can_migrate);
        setPermissionReason(result.reason || '');
      }
    } catch (err) {
      console.error('Permission check failed:', err);
      setCanMigrate(true);
    }
  };

  const validateToken = async () => {
    setValidatingToken(true);
    setTokenValidationResult(null);
    try {
      const response = await fetch(`${API_BASE}/validate-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proxmox_api_token_id: proxmoxTokenId,
          proxmox_api_token_secret: proxmoxTokenSecret
        })
      });

      const result = await response.json();

      if (result.success) {
        setTokenValidationResult({
          success: true,
          message: 'Token is valid!',
          permissions: result.permissions || [],
          version: result.version || 'Unknown'
        });
      } else {
        setTokenValidationResult({
          success: false,
          message: result.error || 'Token validation failed',
          permissions: []
        });
      }
    } catch (error) {
      setTokenValidationResult({
        success: false,
        message: `Validation error: ${error.message}`,
        permissions: []
      });
    } finally {
      setValidatingToken(false);
    }
  };

  return {
    canMigrate, setCanMigrate,
    permissionReason, setPermissionReason,
    proxmoxTokenId, setProxmoxTokenId,
    proxmoxTokenSecret, setProxmoxTokenSecret,
    validatingToken,
    tokenValidationResult,
    tokenAuthError, setTokenAuthError,
    checkPermissions,
    validateToken
  };
}
