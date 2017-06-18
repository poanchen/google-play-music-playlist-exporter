immutableJSScriptUrl="https://cdnjs.cloudflare.com/ajax/libs/immutable/3.8.1/immutable.min.js"
immutableJSScriptFileName="immutable.min.js"
tryCurl=false

echo "[INFO] Try downloading ${immutableJSScriptFileName} using curl."
if curl "${immutableJSScriptUrl}" > "${immutableJSScriptFileName}"
then
  tryCurl=true
  echo "[INFO] ${immutableJSScriptFileName} has been downloaded and saved."
fi

if [ "$tryCurl" = false ] ; then
  echo "[WARNING] Seems like you did not have curl installed. Let's try wget instead."
fi