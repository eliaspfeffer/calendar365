# Homebrew Tap for calendar365

This directory contains the Homebrew formula for calendar365.

## Setup Your Own Tap

To distribute via Homebrew, create a new GitHub repository called `homebrew-tap`:

1. Create repo: `https://github.com/eliaspfeffer/homebrew-tap`
2. Copy the formula file there:
   ```bash
   mkdir -p homebrew-tap/Formula
   cp Formula/calendar365.rb homebrew-tap/Formula/
   ```
3. Push to GitHub

## User Installation

Once your tap is set up, users can install with:

```bash
# Add the tap
brew tap eliaspfeffer/tap

# Install calendar365
brew install calendar365
```

Or in one command:

```bash
brew install eliaspfeffer/tap/calendar365
```

## Updating the Formula

After publishing a new version to npm:

1. Get the new tarball URL: `https://registry.npmjs.org/calendar365/-/calendar365-X.Y.Z.tgz`
2. Calculate SHA256: `curl -sL <url> | shasum -a 256`
3. Update `url` and `sha256` in the formula
4. Push to your tap repository

## Alternative: Local Formula Installation

Users can also install directly from the formula without a tap:

```bash
brew install --formula https://raw.githubusercontent.com/eliaspfeffer/calendar365/main/Formula/calendar365.rb
```

