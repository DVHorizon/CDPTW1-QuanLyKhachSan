@echo off
cd /d "%~dp0\.."
chcp 65001 >nul
echo ========================================================
echo   KHOI DONG DUAL SEARCH ENGINE (ELASTICSEARCH & SOLR)
echo ========================================================

echo 1. Dang khoi dong Apache Solr 10.1 (Cong 8983)...
start "Apache Solr" /B cmd /c "cd /d D:\SEARCH ENGINE\Solr\solr-10.1.0\solr-10.1.0\bin && solr.cmd start"

echo 2. Dang khoi dong Elasticsearch 9.5 (Cong 9200)...
start "Elasticsearch" /B cmd /c "cd /d D:\SEARCH ENGINE\ElasticSearch\elasticsearch-9.5.6-windows-x86_64\elasticsearch-9.5.6\bin && elasticsearch.bat"

echo 3. Dang khoi dong Docker he thong (MySQL, Backend, Frontend)...
docker compose up -d

echo ========================================================
echo   HE THONG KHACH SAN & DUAL ENGINE DA SAN SANG!
echo   - Backend:       http://localhost:5000
echo   - Frontend:      http://localhost:3000
echo   - Solr Admin:    http://localhost:8983/solr
echo   - Elasticsearch: http://localhost:9200
echo ========================================================
pause
