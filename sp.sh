rm server/temp/*.png
yarn prettier

git add .
git commit -m "$*"
git push --set-upstream origin main