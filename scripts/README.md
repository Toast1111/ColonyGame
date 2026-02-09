# Scripts Directory

This directory contains utility scripts organized by purpose.

## Directory Structure

### `dev/`
Development and debugging utilities.

- **`find_region_refs.sh`** - Checks for remaining references to the removed region system. Used for validation during the region system removal refactor.

## Usage

### Development Scripts

All development scripts should be run from the repository root:

```bash
# Check for region references
./scripts/dev/find_region_refs.sh
```

## Adding New Scripts

When adding new scripts:

1. **Determine the category**: Place scripts in appropriate subdirectories
   - `dev/` - Development, debugging, and diagnostic tools
   - `build/` - Build automation (if needed in future)
   - `deploy/` - Deployment scripts (if needed in future)
   - `test/` - Testing utilities (if needed in future)

2. **Add a shebang**: Start scripts with `#!/bin/bash` or appropriate interpreter

3. **Document the script**: Add a description to this README

4. **Make it executable**: Run `chmod +x scripts/category/script-name.sh`

## Notes

- Most build operations are handled through `npm` scripts in `package.json`
- GitHub Actions workflows are in `.github/workflows/`
- Development commands: See `package.json` scripts section
