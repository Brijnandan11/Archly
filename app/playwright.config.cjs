const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({testDir:'./tests',timeout:30000,workers:1,use:{baseURL:'http://127.0.0.1:5188',headless:true,reducedMotion:'reduce',launchOptions:process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}},webServer:{command:'PORT=5188 node dev.cjs',url:'http://127.0.0.1:5188',reuseExistingServer:false},reporter:'list'});
