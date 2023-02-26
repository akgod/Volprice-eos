const _ = require("lodash");
const config = require("config");
const rp = require('request-promise');
const CryptoJS = require('crypto-js');  
const moment = require("moment");
const { result } = require("lodash");
// const redis = require("./redis");
const fs = require("fs");

const SpotHostName = "https://api.binance.com";

class binance {


  async pairInfo(){
    let url = SpotHostName + "/api/v3/exchangeInfo";  //返回所有币24h价格变动情况
    let options = {
      url: url,
      method: "get",
      json: true,
      headers: { "Accept": "application/json"},
    };

    let rpbody = await rp(options);  
    const symbolArr =[];
    for(let i=0;i<rpbody.symbols.length;i++){    
      if(rpbody.symbols[i].quoteAsset == "USDT" && rpbody.symbols[i].status == "TRADING"){
        if(rpbody.symbols[i].symbol.indexOf("UPUSDT" ) == -1 && rpbody.symbols[i].symbol.indexOf("DOWNUSDT" ) == -1 ){
          symbolArr.push(rpbody.symbols[i].symbol);
        }
      }
    }
    console.log("symbolArr=" , symbolArr );
    console.log("symbolArr.length=" , symbolArr.length );
    fs.writeFile("symbol.json",JSON.stringify(symbolArr), err => {
      if(!err) console.log("-------get symbolInfo success~");
    });

  }

}

let ba = new binance();
module.exports = ba;
ba.pairInfo();//.then(console.log);


