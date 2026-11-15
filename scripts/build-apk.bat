@echo off
set "JAVA_HOME=C:\Users\shaik\AppData\Local\Android\jdk17\jdk-17.0.20.1+1"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "C:\Users\shaik\Desktop\mscurechain\Mscurechain-Frontend-Latest\android"
call gradlew.bat assembleDebug
