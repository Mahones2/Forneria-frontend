#!/bin/bash

echo "========================================"
echo "  CONFIGURACION AUTOMATICA - FRONTEND"
echo "========================================"
echo ""

echo "[1/3] Instalando dependencias..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: No se pudieron instalar las dependencias"
    exit 1
fi

echo "[2/3] Creando archivo .env..."
if [ ! -f .env ]; then
    echo "# URL del Backend API - Desarrollo Local" > .env
    echo "VITE_API_URL=http://127.0.0.1:8000" >> .env
fi

echo ""
echo "========================================"
echo "  CONFIGURACION COMPLETADA!"
echo "========================================"
echo ""
echo "Para ejecutar el servidor:"
echo "  ./run.sh"
echo ""
