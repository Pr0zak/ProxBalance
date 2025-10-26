# Frontend Build & Deployment Instructions

## Overview

ProxBalance uses React (JSX) for the frontend, which must be compiled to JavaScript before deployment.

## File Locations

### Source Files
- **JSX Source**: `/opt/proxmox-balance-manager/src/app.jsx`
- **HTML Template**: `/opt/proxmox-balance-manager/index.html`

### Compiled Files (BOTH locations must be updated)
- **Source Location**: `/opt/proxmox-balance-manager/assets/js/app.js`
- **Nginx Serving Location**: `/var/www/html/assets/js/app.js`

**IMPORTANT**: Always copy the compiled `app.js` to BOTH locations to keep them in sync!

## Prerequisites

The container needs:
- Node.js (v20 LTS recommended)
- npm
- Babel dependencies: `@babel/core`, `@babel/cli`, `@babel/preset-react`

## Compilation Methods

### Method 1: Manual Compilation (in container)

```bash
# SSH into the Proxmox host
ssh root@pve3

# Enter the container
pct exec 100 -- bash

# Navigate to project directory
cd /opt/proxmox-balance-manager

# Install Babel dependencies (if not already installed)
npm install --save-dev @babel/core @babel/cli @babel/preset-react

# Create .babelrc configuration
cat > .babelrc <<'EOF'
{
  "presets": ["@babel/preset-react"]
}
EOF

# Compile JSX to JavaScript
mkdir -p assets/js
node_modules/.bin/babel src/app.jsx --presets=@babel/preset-react --out-file /tmp/app.js

# Copy to BOTH required locations
cp /tmp/app.js /opt/proxmox-balance-manager/assets/js/app.js
cp /tmp/app.js /var/www/html/assets/js/app.js

# Verify file sizes match
ls -lh /opt/proxmox-balance-manager/assets/js/app.js
ls -lh /var/www/html/assets/js/app.js

# Exit container
exit
```

### Method 2: Using update.sh Script

The `update.sh` script automatically handles compilation when you update ProxBalance:

```bash
# From Proxmox host
./update.sh 100
```

This script will:
1. Detect if JSX source exists (`src/app.jsx`)
2. Install Node.js and Babel if needed
3. Compile JSX to JavaScript
4. Copy to both required locations
5. Restart services

### Method 3: Quick Copy from Local Development

If you've made changes to `app.jsx` locally:

```bash
# Copy updated app.jsx to server
cat /mnt/c/Users/zakfo/OneDrive/Documents/GitHub/ProxBalance/src/app.jsx | ssh root@pve3 "cat > /tmp/app.jsx"

# Push into container
ssh root@pve3 "pct push 100 /tmp/app.jsx /opt/proxmox-balance-manager/src/app.jsx"

# Compile in container
ssh root@pve3 pct exec 100 -- bash << 'EOF'
cd /opt/proxmox-balance-manager
mkdir -p assets/js
node_modules/.bin/babel src/app.jsx --presets=@babel/preset-react --out-file /tmp/app.js
cp /tmp/app.js /opt/proxmox-balance-manager/assets/js/app.js
cp /tmp/app.js /var/www/html/assets/js/app.js
echo "✓ Compilation complete!"
ls -lh /opt/proxmox-balance-manager/assets/js/app.js
ls -lh /var/www/html/assets/js/app.js
EOF
```

## Troubleshooting

### Issue: npm not found

Install Node.js and npm:

```bash
pct exec 100 -- bash -c "curl -fsSL https://deb.nodesource.com/setup_20.x -o /tmp/node-setup.sh && bash /tmp/node-setup.sh"
pct exec 100 -- apt-get install -y nodejs
```

### Issue: Babel not found

Install Babel dependencies:

```bash
pct exec 100 -- bash -c "cd /opt/proxmox-balance-manager && npm install --save-dev @babel/core @babel/cli @babel/preset-react"
```

### Issue: Files out of sync

Check if both files have the same size:

```bash
pct exec 100 -- bash -c "ls -lh /opt/proxmox-balance-manager/assets/js/app.js /var/www/html/assets/js/app.js"
```

If different, re-run the compilation and copy steps.

### Issue: Changes not visible in browser

1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
2. Check the HTML file is loading the correct version with cache-busting query parameter
3. Verify nginx is serving from `/var/www/html/assets/js/app.js`

## Development Workflow

1. **Edit JSX Source**: Make changes to `src/app.jsx` in your local repository
2. **Test Locally**: Ensure JSX syntax is valid (no syntax errors)
3. **Copy to Container**: Use Method 3 above to copy and compile
4. **Verify**: Check the web interface to ensure changes are visible
5. **Commit**: Once working, commit changes to git repository
6. **Push**: Push to GitHub dev branch

## Build Script Integration

Both `install.sh` and `update.sh` scripts automatically handle frontend compilation:

- They detect if `src/app.jsx` exists
- Install Node.js and Babel if needed
- Compile JSX to `/tmp/app.js`
- Copy to **both** required locations
- Ensure React libraries are present

No manual intervention needed when using these scripts!

## Common Babel Output

You may see this warning (it's harmless):

```
[BABEL] Note: The code generator has deoptimised the styling of /opt/proxmox-balance-manager/src/app.jsx as it exceeds the max of 500KB.
```

This just means Babel won't format the output for readability due to file size. The compiled code still works perfectly.

## File Size Reference

Typical compiled `app.js` sizes:
- ~450-470 KB (minified by Babel)
- Both locations should have identical file sizes

## Quick Reference Commands

```bash
# Check if files are in sync
ssh root@pve3 pct exec 100 -- bash -c "md5sum /opt/proxmox-balance-manager/assets/js/app.js /var/www/html/assets/js/app.js"

# Rebuild frontend
ssh root@pve3 pct exec 100 -- bash -c "cd /opt/proxmox-balance-manager && node_modules/.bin/babel src/app.jsx --presets=@babel/preset-react --out-file /tmp/app.js && cp /tmp/app.js assets/js/app.js && cp /tmp/app.js /var/www/html/assets/js/app.js"

# Check Node.js and npm versions
ssh root@pve3 pct exec 100 -- node --version
ssh root@pve3 pct exec 100 -- npm --version
```

## Notes for AI Assistants

When modifying the frontend (`src/app.jsx`):

1. **Always** edit the JSX source file, never edit the compiled `app.js` directly
2. After editing, **always** recompile and copy to BOTH locations
3. The compiled files must be identical - verify with `md5sum` or file size comparison
4. If making quick fixes directly to deployed `app.js`, remember to backport changes to `src/app.jsx`
5. Test in the browser after deployment to ensure changes are visible
6. Commit JSX source changes to git, not the compiled `app.js`
