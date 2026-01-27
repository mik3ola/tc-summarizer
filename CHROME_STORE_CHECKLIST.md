# Chrome Web Store Submission Checklist

Use this checklist to ensure your extension is ready for Chrome Web Store submission.

## ✅ Completed

- [x] Permissions justification document created (`PERMISSIONS_JUSTIFICATION.md`)
- [x] Privacy policy created (`PRIVACY_POLICY.md`)
- [x] README updated (removed source code installation)
- [x] Build script created (`build.sh`)
- [x] Store listing content prepared (`CHROME_WEB_STORE_LISTING.md`)
- [x] Manifest updated with icons reference and homepage URL
- [x] Icons directory created with README

## 🔲 TODO Before Submission

### 1. Icons (REQUIRED)
- [ ] Create `icons/icon16.png` (16x16 pixels)
- [ ] Create `icons/icon48.png` (48x48 pixels)
- [ ] Create `icons/icon128.png` (128x128 pixels)
- [ ] Test icons appear correctly in extension

**Tools:** Figma, Canva, or hire a designer on Fiverr

### 2. Screenshots (REQUIRED - at least 1)
- [ ] Take screenshot showing extension in action (1280x800 or 640x400 minimum)
- [ ] Show summary popover with highlighted sections
- [ ] Include confidence indicator
- [ ] Use real website (not mockup)
- [ ] Optional: Take additional screenshots (up to 5 total)

**Recommended:**
- Main feature screenshot (required)
- Options page screenshot
- Multiple sites screenshot

### 3. Update URLs
- [x] Replace `[your-website-url]` in `PRIVACY_POLICY.md` ✅
- [x] Replace `[your-website-url]` in `CHROME_WEB_STORE_LISTING.md` ✅
- [x] Replace `[your-domain]` in `PRIVACY_POLICY.md` ✅
- [ ] Update `homepage_url` in `manifest.json`
- [ ] Update privacy policy URL in Chrome Web Store dashboard

### 4. Test Build
- [ ] Run `./build.sh` to create zip file
- [ ] Verify zip contains all necessary files
- [ ] Test loading extension from zip in Chrome
- [ ] Verify all features work correctly

### 5. Chrome Web Store Developer Account
- [ ] Create Chrome Web Store Developer account ($5 one-time fee)
- [ ] Verify identity (if required)
- [ ] Access Developer Dashboard

### 6. Store Listing
- [ ] Fill in extension name
- [ ] Add short description (132 chars max)
- [ ] Add detailed description (from `CHROME_WEB_STORE_LISTING.md`)
- [ ] Select category: Productivity
- [ ] Upload screenshots
- [ ] Upload promotional images (optional)
- [ ] Add privacy policy URL
- [ ] Add support URL
- [ ] Add homepage URL

### 7. Privacy & Permissions
- [ ] Upload privacy policy (or link to hosted version)
- [ ] Fill in single purpose declaration
- [ ] Justify host permissions (`<all_urls>`)
- [ ] Declare user data collection
- [ ] Add notes for reviewer (from `CHROME_WEB_STORE_LISTING.md`)

### 8. Final Review
- [ ] Review all store listing content
- [ ] Test extension one more time
- [ ] Verify privacy policy is accessible
- [ ] Check all URLs work
- [ ] Ensure icons are correct
- [ ] Verify version number in manifest matches store listing

### 9. Submit
- [ ] Upload zip file
- [ ] Complete all required fields
- [ ] Submit for review
- [ ] Wait for review (typically 1-3 business days)

## Quick Commands

```bash
# Build extension zip
./build.sh

# Test extension locally (after building)
# 1. Go to chrome://extensions
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select the build/ directory
```

## Resources

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Chrome Web Store Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- [Extension Quality Guidelines](https://developer.chrome.com/docs/webstore/quality/)
- [Privacy Requirements](https://developer.chrome.com/docs/webstore/user-data/)

## Common Issues

### Icons Missing
- Chrome Web Store requires all three icon sizes
- Icons must be PNG format
- Icons should have transparent background

### Privacy Policy Required
- Must be publicly accessible
- Must be linked in store listing
- Should match the policy in your extension

### Permissions Rejected
- Provide clear justification for `<all_urls>`
- Reference `PERMISSIONS_JUSTIFICATION.md` in reviewer notes
- Explain why more restrictive permissions won't work

### Review Rejection
- Check email for specific reasons
- Address all reviewer concerns
- Resubmit with fixes

## Support

If you encounter issues:
1. Check Chrome Web Store Developer documentation
2. Review rejection email for specific issues
3. Update extension based on feedback
4. Resubmit

---

**Last Updated:** January 2025
