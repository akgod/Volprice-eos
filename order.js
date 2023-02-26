const config = require("config");
const Binance = require('node-binance-api');
const c = require("config");
const SpotHostName = "https://api.binance.com";
const rp = require('request-promise');
const binance = new Binance().options({
  APIKEY: config.binance.api_key,
  APISECRET: config.binance.secret_key
});
const redis = require("./redis");

class CexBa {
  async USDT(){
    let spotBalance = await binance.balance();
    //console.log(spotBalance);
    return spotBalance.USDT.available;

  }
  async BTC(){
    let spotBalance = await binance.balance();
    //console.log(spotBalance);
    return spotBalance.BTC.available;

  }

  async coinBalance(symbol){
    let coin = symbol.replace("USDT","");
    console.log(coin);

    let spotBalance = await binance.balance();
    let coinBalance = parseFloat(spotBalance[coin].available);
    //console.log("coinBalance=",coinBalance);


    //console.log(spotBalance);
    return coinBalance;
  }

  async coinValue(symbol){
    let coin = symbol.replace("USDT","");
    //console.log(coin);
    let spotBalance = await binance.balance();
    let coinBalance = parseFloat(spotBalance[coin].available);
    //console.log("coinBalance=",coinBalance);

    let allcoinprices = await binance.prices();
    let coinPrice = parseFloat(allcoinprices[symbol]);
    //console.log("coinPrice=",coinPrice);

    let coinValue = coinBalance * coinPrice;

    //console.log(spotBalance);
    return coinValue;
  }

  async OrderPriceSet(){
    let url = SpotHostName + "/api/v3/exchangeInfo";  
    let options = {
      url: url,
      method: "get",
      json: true,
      headers: { "Accept": "application/json"},
    };

    let rpbody = await rp(options);  
    for(let i=0;i<rpbody.symbols.length;i++){    
      if(rpbody.symbols[i].quoteAsset == "USDT" && rpbody.symbols[i].status == "TRADING"){
        let symbol = rpbody.symbols[i].symbol;

        let OrderPrice = await redis.get(symbol);
        if(OrderPrice !=0){
            let coinValue = await this.coinValue(symbol);
            console.log("--------",symbol," coinValue=",coinValue);
            if(coinValue < 10){
              console.log(symbol,"估值太低,orderprice重置为0");
              await redis.set(symbol,"0");
            }
            await sleep(300);
        }
      }
    }

  }

  async coinInfo(symbol){
    let exchangeInfourl = SpotHostName + "/api/v3/exchangeInfo?symbol=" + symbol ;  
    let exchangeInfooptions = {
      url: exchangeInfourl,
      method: "get",
      json: true,
      headers: { "Accept": "application/json"},
    };
    let result = await rp(exchangeInfooptions);  
    // console.log(result);
    // console.log("-------------------");
    // console.log(typeof(result));
    // console.log("--------************-----------");

    // console.log(result.symbols[0].filters[2]);
    // console.log(result.symbols[0].filters[2].stepSize);
    let noun = 1/result.symbols[0].filters[2].stepSize;
    let quantityPrecision = Math.log10(noun);
    //console.log(typeof(quantityPrecision));
    // let i = 1.23456;
    // console.log(i.toFixed(quantityPrecision));
    // console.log(typeof(i.toFixed(quantityPrecision)));

    return quantityPrecision;
  }

  async depth(symbol){
    let depthurl = SpotHostName + "/api/v3/depth?symbol=" + symbol + "&limit=" + 8;  
    let depthoptions = {
      url: depthurl,
      method: "get",
      json: true,
      headers: { "Accept": "application/json"},
    };
    let orderBook = await rp(depthoptions);  
    return orderBook;
  }

  async getaggTrades(symbol){
    let url = SpotHostName + "/api/v3/aggTrades?symbol=" + symbol + "&limit=" + 1;  
    let options = {
      url: url,
      method: "get",
      json: true,
      headers: { "Accept": "application/json"},
    };
    let trades = await rp(options);  
    return trades;
  }

  
  async marketBuy(symbol,amount){
    let result = await binance.marketBuy( symbol,amount); 
    return result;
  }
  async marketSell(symbol,amount){
      let result = await binance.marketSell( symbol,amount ); 
      return result;
  }
  async limitBuy(symbol,quantity,price){
    let result = await binance.buy(symbol, quantity, price);
    //  console.log(result);
    //console.log(result.orderId);
    // console.log("------------");
    return result.orderId;
  }

  async limitSell(symbol,quantity,price){
    let result = await binance.sell(symbol, quantity, price);
    return result.orderId;
  }

  async orderStatus(orderid){

   let res = await binance.orderStatus("BTCUSDT", orderid);      
   //console.log(res);
   return res.status;    
  }
  
  async getopenorder(symbol){
   let res = await binance.openOrders(symbol);
   return res;
  }

  async cancelOrder(symbol,orderid){
     let res = await binance.cancel(symbol, orderid);
     return res.status;
  }

  async latestprice(symbol){
    //let futureprice =  await binance.bookTickers();
    let askbid = await binance.bookTickers(symbol);
    //console.info( prices);
   // console.log(askbid);
    //console.log(typeof(prices[symbol]));
    // binance.bookTickers('BNBBTC', (error, ticker) => {
    //   console.info("bookTickers", ticker);
    // });
    return(parseFloat(askbid.askPrice));

  }
}


let ba = new CexBa();
module.exports = ba;
//ba.USDT().then(console.log); //.then(console.log)
//ba.latestprice('EOSUSDT').then(console.log);

//ba.marketBuy('QUICKUSDT','0.234').then(console.log);
//ba.marketSell('EOSUSDT',10).then(console.log);
//ba.OrderPriceSet().then(console.log);
//ba.coinValue('STMXUSDT').then(console.log);
//ba.coinBalance('BTCDOWNUSDT').then(console.log);



//ba.depth("BTCUSDT").then(console.log);
//ba.limitBuy("BTCUSDT",0.00103,18566).then(console.log);
//ba.orderStatus("14251125991").then(console.log);
//ba.cancelOrder("BTCUSDT","14251774107").then(console.log);
//ba.getopenorder("BTCUSDT").then(console.log);
//ba.BTC().then(console.log);
