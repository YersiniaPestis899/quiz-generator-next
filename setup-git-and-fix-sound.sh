#!/bin/bash

# Initialize Git repository if not already initialized
if [ ! -d ".git" ]; then
  echo "Initializing Git repository..."
  git init
  git add .
  git commit -m "Initial commit"
else
  echo "Git repository already initialized."
fi

# Create and switch to a new branch
echo "Creating branch for sound fixes..."
git checkout -b fix-sound-effects

# Ensure the changes are applied by touching the files
touch lib/soundGenerator.ts
touch components/SoundEffects.tsx

# Add and commit the changes
git add lib/soundGenerator.ts components/SoundEffects.tsx
git commit -m "Fix: Restore sound effects in production environment

- Add explicit audio initialization on user interaction to comply with browser autoplay policies
- Improve error handling in Web Audio API integration
- Add initialization tracking to prevent premature sound playback
- Add multiple event listeners (click, keydown, touchstart) to ensure initialization works on all devices
- Fix audio context suspended state handling"

echo ""
echo "Changes committed to 'fix-sound-effects' branch."
echo "To push to your GitHub repository, use:"
echo ""
echo "  git remote add origin https://github.com/your-username/quiz-generator-next.git"
echo "  git push -u origin fix-sound-effects"
echo ""
echo "Then create a pull request to merge the changes to your main branch."
