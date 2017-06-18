immutableJSScriptUrl="https://cdnjs.cloudflare.com/ajax/libs/immutable/3.8.1/immutable.min.js"
immutableJSScriptFileName="immutable.min.js"
tryCurl=false
tryWget=false

echo "[INFO] Try downloading ${immutableJSScriptFileName} using curl."
if curl "${immutableJSScriptUrl}" > "${immutableJSScriptFileName}"; then
  tryCurl=true
  echo "[INFO] ${immutableJSScriptFileName} has been downloaded and saved."
fi

if [ "$tryCurl" = false ]; then
  echo "[WARNING] Seems like you did not have curl installed. Let's try wget instead."
  if wget -O "${immutableJSScriptFileName}" "${immutableJSScriptUrl}"; then
    tryWget=true
    echo "[INFO] ${immutableJSScriptFileName} has been downloaded and saved."
  fi
fi

if [[ "$tryWget" == false && "$tryCurl" == false ]]; then
  echo "[WARNING] Seems like you did not have wget installed as well. Try install curl or wget in your machine."
fi
