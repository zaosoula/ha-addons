const axios = require('axios');
const fs = require('fs');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar, Cookie } = require('tough-cookie');
const path = require('path');


class Voltalis {
  constructor(username, password) {
    this.credentials = {
      username, 
      password,
      stayLoggedIn: true
    }
    this.cookiePath = process.env.NODE_ENV === 'production' ? '/data/cookies.json' : path.join(__dirname, 'cookies.json');

    this.user = null;

    this.initAxios();
  }

  initAxios() {
    let previousCookieJarJSON;
    const saveCookieJar = (res) => {
      const cookieJarJSON = JSON.stringify(res.config.jar);
      if(cookieJarJSON != previousCookieJarJSON) {
        fs.writeFileSync(this.cookiePath, cookieJarJSON);
        previousCookieJarJSON = cookieJarJSON;
      }
    }

    if (fs.existsSync(this.cookiePath)) {
      const cookieJarJSON = fs.readFileSync(this.cookiePath);
      	const cookies = JSON.parse(cookieJarJSON);
        this.jar = CookieJar.fromJSON(cookies);
        previousCookieJarJSON = cookieJarJSON;
    }else{
      this.jar = new CookieJar();
    }

    this.api = wrapper(axios.create({
      withCredentials: true,
      baseURL: 'https://classic.myvoltalis.com/',
      jar: this.jar
    }));

    this.api.interceptors.request.use((config) => {
      if(this.isLoggedIn()){
        config.headers['User-Site-Id'] = this.getMainSite().id;
      }
      return config;
    });

   this.api.interceptors.response.use(function (response) {
      saveCookieJar(response);
      return response;
    }, function (error) {
      saveCookieJar(error);
      return Promise.reject(error);
    });

  }

  isLoggedIn() {
    return this.user !== null;
  }

  ensureIsLoggedIn() {
    if(!this.isLoggedIn()) {
      throw new Error('Use .login() first');
    }
  }

  getMainSite() {
    this.ensureIsLoggedIn();

    return this.user.subscriber.siteList.find(site => site.isMain);
  }

  getModulators() {
    this.ensureIsLoggedIn();

    return this.getMainSite().modulatorList;
  }
  
  async login() {
    let res;
    try {
      res = await this.api.post('/login', this.credentials);
    } catch (err) {
      this.user = null;

      if(err.response) {  
        if(err.response.status === 401){
          throw new Error('Bad Credentials');
        }
      }


      console.log(err);
      throw new Error('Unable to login');
    }

    this.user = res.data;
    return this.user;
  }

  async fetchImmediateConsumptionInkW() {
    return this.api.get('/siteData/immediateConsumptionInkW.json').then(({data}) => data);
  }
}

module.exports = Voltalis;
