#!/usr/bin/env bash
# Usage: ./verify-deploy.sh https://<preview-or-production-url>
# Checks the page, the public résumé (status, type, filename, caching) and that the confidential original is NOT served.
set -u; U="${1%/}"; fail=0
chk(){ printf '%-58s %s\n' "$1" "$2"; [ "$3" = ok ] || fail=1; }
h=$(curl -sSI "$U/resume/Harshil-Srivastav-Resume.pdf")
code=$(printf '%s' "$h" | awk 'NR==1{print $2}')
[ "$code" = 200 ] && chk "resume PDF reachable" "200" ok || chk "resume PDF reachable" "${code:-no response}" bad
printf '%s' "$h" | grep -qi '^content-type: application/pdf' && chk "content-type application/pdf" yes ok || chk "content-type application/pdf" no bad
printf '%s' "$h" | grep -qi 'content-disposition: inline; filename="Harshil-Srivastav-Resume.pdf"' && chk "opens inline, filename Harshil-Srivastav-Resume.pdf" yes ok || chk "opens inline with filename" no bad
printf '%s' "$h" | grep -i '^cache-control' | tr -d '\r' | sed 's/^/  /'
curl -sS "$U/resume/Harshil-Srivastav-Resume.pdf" -o /tmp/_resume.pdf && head -c 5 /tmp/_resume.pdf | grep -q '%PDF-' && chk "body is a real PDF" yes ok || chk "body is a real PDF" no bad
if command -v pdftotext >/dev/null; then pdftotext /tmp/_resume.pdf - | grep -q 'INR [0-9]' && chk "no INR figures in public copy" "FOUND" bad || chk "no INR figures in public copy" yes ok; fi
c=$(curl -s -o /dev/null -w '%{http_code}' "$U/documents/Harshil_Srivastav_Resume-3_ORIGINAL_CONFIDENTIAL.pdf")
[ "$c" = 404 ] && chk "confidential original NOT served" "404" ok || chk "confidential original NOT served" "$c" bad
c=$(curl -s -o /dev/null -w '%{http_code}' "$U/"); [ "$c" = 200 ] && chk "home page" 200 ok || chk "home page" "$c" bad
for a in js/cine.js js/badge.js js/afterparty.js img/og-card.jpg img/speaking-hd.webp; do c=$(curl -s -o /dev/null -w '%{http_code}' "$U/$a"); [ "$c" = 200 ] && chk "$a" 200 ok || chk "$a" "$c" bad; done
curl -s "$U/" | grep -q 'drive.google' && chk "no Google Drive links in page" FOUND bad || chk "no Google Drive links in page" yes ok
[ $fail = 0 ] && echo "ALL CHECKS PASSED" || { echo "SOME CHECKS FAILED"; exit 1; }
