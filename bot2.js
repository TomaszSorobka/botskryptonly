const puppeteer = require('puppeteer');
// const Datastore = require('nedb');
const mysql = require('mysql');

var pool = mysql.createPool({
  host: 'eu-cdbr-west-01.cleardb.com',
  port: '3306', 
  user: 'b71a94d125faf7', 
  password: '575376a6',
  database: 'heroku_e84c4376fe837e8',
  connectionLimit: '10',
  multipleStatements: true
});

(async () => {
  const browser = await puppeteer.launch({headless: false, args: ["--no-sandbox"]});
  const page = await browser.newPage();
  await page.goto('https://hurt.handlosfera.pl/login');
  let link = 'https://hurt.handlosfera.pl/wszystkie.html'

  //CREDENTIALS
  let login = 'solvolyse@company-mails.com'
  let password = '0bae067b'
  // Variables
  let onemoretime = false;
  let prodcount = '';
  let price;
  let pages = 0;
  let products;
  let stock;
  let productname;
  let setamount = '5000';
  let data = {
    productname: '',
    stock:'',
    price:'',
    date:''
  }
  let arrayofdata = [];
  const date = new Date();
  let day = date.getDate();
  if(day<10) day = '0'+day;
  let month = date.getMonth() +1;
  if(month<10) month = '0'+month;
  let year = date.getFullYear();
  let UTCdate = year.toString() +'-'+month.toString()+'-'+day.toString();
  console.log(UTCdate);

  //LOG IN to handlosfera
  try {
      await page.type('input[name="login"]', login);
      await page.type('input[type="password"]', password);
  
      
      await page.click('.redBtn')
      

      // await Promise.all([
      //   page.waitForNavigation({timeout: 60000}),
      //   await page.click('.redBtn')
      // ]);

      console.log("Logged in :)")
  } catch (err) {
    console.log('Could not login or load the page with products');
    console.error(err);
    process.abort();
  } 

  try {
    await Promise.all([
      page.waitForNavigation(),
      await page.goto(link)
    ]);
  } catch (err) {
    console.log('Could not load product page again...');
    console.error(err);
    console.log('Trying one more time...');
    onemoretime = true;
    
    
  }
  if (onemoretime) {
    try {
      await Promise.all([
        page.waitForNavigation(),
        await page.goto(link)
      ]);
      console.log("Second time success")
  } catch (err) {
    console.log('Could not login again...');
    console.error(err);
    process.abort();
    } 
  }


  // Establishing the number of pages
  prodcount = await page.evaluate(
      () => document.querySelector('.prodcount').innerHTML
  );
  prodcount = prodcount.replace(/\D/g,'');
  pages = Math.ceil(prodcount/21);

  //OUTER LOOP for subpages
  for (let podstronki = 1; podstronki<pages+1; podstronki++) {
    await page.goto('https://hurt.handlosfera.pl/wszystkie' + podstronki + '.html');
    products = await page.$$('.singleProductContainer');

                //INNNER LOOP scraping the information
                for (let i = 0; i<products.length; i++) {
                  
                  try {
                   
                    //Entering the product
                    await Promise.all([
                    page.waitForNavigation(),
                    await products[i].click()
                    ]);
                    
                    await page.waitForTimeout(10000);
                    //Getting the product's name
                    productname = await page.evaluate(
                      () => document.querySelector('h1').innerHTML
                    );
                    //Getting the product's prize
                    price = await page.evaluate(
                      () => document.querySelector('.actualPrize').innerHTML
                    );
                    price = price.replace(/[^\d.-]/g, '');
                    price = parseFloat(price);
                    //Getting the product's quantity
                    stock = await page.evaluate(
                      () => document.querySelector('.greenPrice').innerHTML
                  );
                    stock = stock.replace(/\D/g,'');
                    // Sending a request if a product's quantity is listed as 99+
                    if (stock == 99) {
                      await page.type('#amount', setamount);
                      await page.click('.cartAddBtn');
                      await page.waitForTimeout(1000);
                      stock = await page.evaluate(
                        () => document.querySelector('.simplemodal-data').innerHTML
                    );
                    stock = stock.replace(/\D/g,'');
                    stock = stock/10000;
                    }
                    stock = parseInt(stock);
                    //Pushing the data into the array

                    data = {productname: productname, stock: stock, price: price, dater: UTCdate};
                    arrayofdata.push(data);
					          
                      let sqlstring = `INSERT into Main(productname, stock, price, dater)values("${productname}", ${stock}, ${price}, "${UTCdate}")`;
                       pool.query(sqlstring, function(err, result){
                         if (err) throw err;
                         console.log('added');
                       })
                      
                    console.log(productname);
                    } catch (err) {
                      console.log("Could not add the product because why not");
                      console.error(err);
                    }
                    await Promise.all([
                    page.waitForNavigation(),
                    await page.goto('https://hurt.handlosfera.pl/wszystkie' + podstronki + '.html')
                    ]);
                    products = await page.$$('.singleProductContainer');
                    await page.waitForTimeout(50000); //add catch?
                }

    console.log('The subpage of ' + link + ' number ' + podstronki + ' has been finished.')
    }
	browser.close();
})();