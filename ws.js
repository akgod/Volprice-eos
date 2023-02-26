const config = require("config");
const moment = require("moment");
const fs = require("fs");
const redis = require("./redis");
const order =require("./order");
const WebSocket = require('ws');   ///btcusdt@kline_5m/bnbusdt@kline_5m/ethusdt@kline_5m/eosusdt@kline_5m

const data = JSON.parse(fs.readFileSync('symbol.json', 'utf-8'));
let wssUrl = "wss://stream.binance.com:9443/ws";
for(let i=0;i<data.length;i++){     
  let symbol = data[i];
  wssUrl = wssUrl + "/" + symbol.toLowerCase() + "@kline_5m";
}
console.log("wssUrl = ", wssUrl);

const ws = new WebSocket(wssUrl); // btcusdt@kline_5m/bnbusdt@kline_5m/ethusdt@kline_5m/

class Runner {

  async run() {
    await redis.connect();

    ws.on('message', async function message(data){
          console.log(`\n[${moment().format("YYYY-MM-DD HH:mm:ss")}]`);
          let res = JSON.parse(data);
          let symbol = res.s;
          let nowPrice = res.k.c;
          let nowPriceChange = (res.k.c - res.k.o) /res.k.o;
          let nowVolume = res.k.v;
          let OrderPrice = await redis.get(symbol);
          let avgPriceChange = await redis.get(symbol + "_avgPriceChange");
          let avgVolume = await redis.get(symbol + "_avgVolume");

          console.log("-------------------");
          console.log(symbol);
          console.log("nowPrice=",nowPrice);
          console.log("nowPriceChange=",nowPriceChange);
          console.log("nowVolume=",nowVolume);
          console.log("avgPriceChange=",avgPriceChange);
          console.log("avgVolume=",avgVolume);
          console.log("OrderPrice=",OrderPrice);

//下单判断
          if(OrderPrice == 0 && nowPriceChange > config.app.MinpriceChangePercent  &&  nowPriceChange > config.app.avgPriceChangeNoun * avgPriceChange && nowVolume > config.app.avgVolumeNoun * avgVolume){    //
              console.log("---------wowowoowow----------");
              let usdtbalance = await order.USDT();
  
              if(usdtbalance < config.app.orderusdtanount){console.log("USDT 资金不足");return}
  
              let quantityPrecision = await redis.get(symbol + "_precision");
  
              let orderVolume = (config.app.orderusdtanount/nowPrice).toFixed(quantityPrecision);
              console.log("---------下单----------");
              console.log("config.app.orderusdtanount=",config.app.orderusdtanount);
              console.log("orderPrice=",nowPrice);
              console.log("orderVolume=",orderVolume);              
              await order.marketBuy(symbol,orderVolume);//.then(console.log);
              await redis.set(symbol,nowPrice);
              await sleep(200);
          }
//RISK
          if(OrderPrice !=0){          
              console.log("---------持仓----------");

              let stopLossPrice = OrderPrice * (1 - config.app.stopspace);
              let stopProfitPrice = OrderPrice * (1 + config.app.profitspace);
              console.log(symbol,"  stopLossPrice==",stopLossPrice.toFixed(8),"  stopProfitPrice==",stopProfitPrice.toFixed(8));
            //---------止损------------
              if(nowPrice < stopLossPrice){
                     console.log("***********RISK**********");

                      let coinValue = await order.coinValue(symbol);
                      console.log(symbol,"coinValue=",coinValue);

                      if(coinValue < 10){
                        console.log(symbol,"估值太低,orderprice重置为0");
                        await redis.set(symbol,"0");       //如果持仓太小，orderprice重置为0
                        return;
                      }  
                      let coinBalance = await order.coinBalance(symbol);
                      console.log(symbol,"coinBalance=",coinBalance);

                      let quantityPrecision = await redis.get(symbol + "_precision");
                      console.log(symbol,"quantityPrecision=",quantityPrecision);
                      let s = Math.pow(10,quantityPrecision);
                      let orderVolume = Math.floor(coinBalance*s)/s ;
                      console.log(symbol,"orderVolume=",orderVolume);

                      await order.marketSell(symbol,orderVolume);//.then(console.log);
                      await redis.set(symbol,"0");
                      console.log("SSSSSSSSSSSSSSTTTTTTTTTTOOOOOOOPPPPP");

              }
            //---------止盈------------
              if(nowPrice > stopProfitPrice){
                       console.log("$$$$$$$$$$$$$$RISK$$$$$$$$$$$$");

                      let coinValue = await order.coinValue(symbol);
                      console.log(symbol,"coinValue=",coinValue);

                      if(coinValue < 10){
                        console.log(symbol,"估值太低,orderprice重置为0");
                        await redis.set(symbol,"0");       //如果持仓太小，orderprice重置为0
                        return;
                      }  

                      if(coinValue < config.app.orderusdtanount/2){  //盈利平仓2次后，不再止盈 ，只移动止损
                        let newOrderPrice = OrderPrice * (1+ config.app.profitspace/1.5);
                        await redis.set(symbol,newOrderPrice.toString());
                        console.log(symbol,"让利润奔跑吧。。。。");
                        return;
                      } 
                      let coinBalance = await order.coinBalance(symbol);
                      console.log(symbol,"coinBalance=",coinBalance);

                      let quantityPrecision = await redis.get(symbol + "_precision");
                      console.log(symbol,"quantityPrecision=",quantityPrecision);

                      let s = Math.pow(10,quantityPrecision);
                      let orderVolume = Math.floor(coinBalance *0.5*s)/s ; //止盈一半仓位

                      console.log(symbol,"orderVolume=",orderVolume);

                      await order.marketSell(symbol,orderVolume);//.then(console.log);
                      let newOrderPrice = OrderPrice * (1+ config.app.profitspace/1.5);
                      await redis.set(symbol,newOrderPrice.toString());
                      console.log("%%%%%%%%##########$$$$$$$$#####$@$$$$$$$$$$$$$$########^^^^^^!!!!!!!$#$");

              }

          }

        });

  }
}


let ba = new Runner();
module.exports = ba;

ba.run();


//ba.USDT().then(console.log); //.then(console.log)
//ba.latestprice('EOSUSDT').then(console.log);

//ba.marketBuy('QUICKUSDT','0.234').then(console.log);
//ba.marketSell('EOSUSDT',10).then(console.log);
//ba.coinValue('STMXUSDT').then(console.log);
//ba.coinBalance('BTCDOWNUSDT').then(console.log);