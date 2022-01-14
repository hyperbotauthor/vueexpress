rm server/temp/*.png
yarn prettier

git add .
git commit -m "$*"
git push --set-upstream origin main

. archive.sh
git add repo.tar.gz
git commit -m "repo.tar.gz"
git push
