import{K as g,ar as P,as as b,at as j,Q as k,au as m,W as U,Y as K,av as L,aw as x,i as z,a as N,x as c,a5 as O,c as $,T as f,aj as w,R as v,a7 as M,aa as u}from"./index-Cr5N_0pd.js";import{W3mEmailOtpWidget as R}from"./email-OHUMhOV6.js";class V{constructor(e){this.expiration=e.expiration,this.getNonce=e.getNonce,this.getRequestId=e.getRequestId,this.domain=e.domain,this.uri=e.uri,this.statement=e.statement,this.resources=e.resources}async createMessage(e){const t={accountAddress:e.accountAddress,chainId:e.chainId,version:this.version,domain:this.domain,uri:this.uri,statement:this.statement,resources:this.resources,nonce:await this.getNonce(e),requestId:await this.getRequestId?.(),expirationTime:this.getExpirationTime(e),issuedAt:this.getIssuedAt(),notBefore:this.getNotBefore(e)};return Object.assign(t,{toString:()=>this.stringify(t)})}getExpirationTime({notBefore:e}){if(typeof this.expiration>"u")return;const t=e?new Date(e).getTime():Date.now();return this.stringifyDate(new Date(t+this.expiration))}getNotBefore({notBefore:e}){return e?this.stringifyDate(new Date(e)):void 0}getIssuedAt(){return this.stringifyDate(new Date)}stringifyDate(e){return e.toISOString()}}class X extends V{constructor({clearChainIdNamespace:e,...t}){super(t),this.version="1",this.clearChainIdNamespace=e||!1}getNetworkName(e){const t=g.getAllRequestedCaipNetworks();return P.getNetworkNameByCaipNetworkId(t,e)}stringify(e){const t=this.clearChainIdNamespace?e.chainId.split(":")[1]:e.chainId,i=this.getNetworkName(e.chainId);return[`${e.domain} wants you to sign in with your ${i} account:`,e.accountAddress,e.statement?`
${e.statement}
`:"",`URI: ${e.uri}`,`Version: ${e.version}`,`Chain ID: ${t}`,`Nonce: ${e.nonce}`,e.issuedAt&&`Issued At: ${e.issuedAt}`,e.expirationTime&&`Expiration Time: ${e.expirationTime}`,e.notBefore&&`Not Before: ${e.notBefore}`,e.requestId&&`Request ID: ${e.requestId}`,e.resources?.length&&e.resources.reduce((s,n)=>`${s}
- ${n}`,"Resources:")].filter(s=>typeof s=="string").join(`
`).trim()}}class T{constructor(e={}){this.otpUuid=null,this.listeners={sessionChanged:[]},this.localAuthStorageKey=e.localAuthStorageKey||b.SIWX_AUTH_TOKEN,this.localNonceStorageKey=e.localNonceStorageKey||b.SIWX_NONCE_TOKEN,this.required=e.required??!0,this.messenger=new X({domain:typeof document>"u"?"Unknown Domain":document.location.host,uri:typeof document>"u"?"Unknown URI":document.location.href,getNonce:this.getNonce.bind(this),clearChainIdNamespace:!1})}async createMessage(e){return this.messenger.createMessage(e)}async addSession(e){const t=await this.request({method:"POST",key:"authenticate",body:{data:e.data,message:e.message,signature:e.signature,clientId:this.getClientId(),walletInfo:this.getWalletInfo()},headers:["nonce","otp"]});this.setStorageToken(t.token,this.localAuthStorageKey),this.emit("sessionChanged",e),this.setAppKitAccountUser(B(t.token)),this.otpUuid=null}async getSessions(e,t){try{if(!this.getStorageToken(this.localAuthStorageKey))return[];const i=await this.request({method:"GET",key:"me",query:{},headers:["auth"]});if(!i)return[];const s=i.address.toLowerCase()===t.toLowerCase(),n=i.caip2Network===e;if(!s||!n)return[];const a={data:{accountAddress:i.address,chainId:i.caip2Network},message:"",signature:""};return this.emit("sessionChanged",a),this.setAppKitAccountUser(i),[a]}catch{return[]}}async revokeSession(e,t){return Promise.resolve(this.clearStorageTokens())}async setSessions(e){if(e.length===0)this.clearStorageTokens();else{const t=e.find(i=>i.data.chainId===j()?.caipNetworkId)||e[0];await this.addSession(t)}}getRequired(){return this.required}async getSessionAccount(){if(!this.getStorageToken(this.localAuthStorageKey))throw new Error("Not authenticated");return this.request({method:"GET",key:"me",body:void 0,query:{includeAppKitAccount:!0},headers:["auth"]})}async setSessionAccountMetadata(e=null){if(!this.getStorageToken(this.localAuthStorageKey))throw new Error("Not authenticated");return this.request({method:"PUT",key:"account-metadata",body:{metadata:e},headers:["auth"]})}on(e,t){return this.listeners[e].push(t),()=>{this.listeners[e]=this.listeners[e].filter(i=>i!==t)}}removeAllListeners(){Object.keys(this.listeners).forEach(t=>{this.listeners[t]=[]})}async requestEmailOtp({email:e,account:t}){const i=await this.request({method:"POST",key:"otp",body:{email:e,account:t}});return this.otpUuid=i.uuid,this.messenger.resources=[`email:${e}`],i}confirmEmailOtp({code:e}){return this.request({method:"PUT",key:"otp",body:{code:e},headers:["otp"]})}async request({method:e,key:t,query:i,body:s,headers:n}){const{projectId:a,st:o,sv:W}=this.getSDKProperties(),p=new URL(`${k.W3M_API_URL}/auth/v1/${String(t)}`);p.searchParams.set("projectId",a),p.searchParams.set("st",o),p.searchParams.set("sv",W),i&&Object.entries(i).forEach(([h,C])=>p.searchParams.set(h,String(C)));const y=await fetch(p,{method:e,body:s?JSON.stringify(s):void 0,headers:Array.isArray(n)?n.reduce((h,C)=>{switch(C){case"nonce":h["x-nonce-jwt"]=`Bearer ${this.getStorageToken(this.localNonceStorageKey)}`;break;case"auth":h.Authorization=`Bearer ${this.getStorageToken(this.localAuthStorageKey)}`;break;case"otp":this.otpUuid&&(h["x-otp"]=this.otpUuid);break}return h},{}):void 0});if(!y.ok)throw new Error(await y.text());return y.headers.get("content-type")?.includes("application/json")?y.json():null}getStorageToken(e){return m.getItem(e)}setStorageToken(e,t){m.setItem(t,e)}clearStorageTokens(){this.otpUuid=null,m.removeItem(this.localAuthStorageKey),m.removeItem(this.localNonceStorageKey),this.emit("sessionChanged",void 0)}async getNonce(){const{nonce:e,token:t}=await this.request({method:"GET",key:"nonce"});return this.setStorageToken(t,this.localNonceStorageKey),e}getClientId(){return U.state.clientId}getWalletInfo(){const{connectedWalletInfo:e}=K.state;if(!e)return;if("social"in e){const n=e.social,a=e.identifier;return{type:"social",social:n,identifier:a}}const{name:t,icon:i}=e;let s="unknown";switch(e.type){case x.CONNECTOR_TYPE_EXTERNAL:case x.CONNECTOR_TYPE_INJECTED:case x.CONNECTOR_TYPE_ANNOUNCED:s="extension";break;case x.CONNECTOR_TYPE_WALLET_CONNECT:s="walletconnect";break;default:s="unknown"}return{type:s,name:t,icon:i}}getSDKProperties(){return L._getSdkProperties()}emit(e,t){this.listeners[e].forEach(i=>i(t))}setAppKitAccountUser(e){const{email:t}=e;t&&Object.values(k.CHAIN).forEach(i=>{g.setAccountProp("user",{email:t},i)})}}function B(r){const e=r.split(".");if(e.length!==3)throw new Error("Invalid token");const t=e[1];if(typeof t!="string")throw new Error("Invalid token");const i=t.replace(/-/gu,"+").replace(/_/gu,"/"),s=i.padEnd(i.length+(4-i.length%4)%4,"=");return JSON.parse(atob(s))}const A=z`
  .hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--wui-spacing-3xs);

    transition-property: margin, height;
    transition-duration: var(--wui-duration-md);
    transition-timing-function: var(--wui-ease-out-power-1);
    margin-top: -100px;

    &[data-state='loading'] {
      margin-top: 0px;
    }

    position: relative;
    &:after {
      content: '';
      position: absolute;
      bottom: 0;
      height: 252px;
      width: 360px;
      background: radial-gradient(
        96.11% 53.95% at 50% 51.28%,
        transparent 0%,
        color-mix(in srgb, var(--wui-color-bg-100) 5%, transparent) 49%,
        color-mix(in srgb, var(--wui-color-bg-100) 65%, transparent) 99.43%
      );
    }
  }

  .hero-main-icon {
    width: 176px;
    transition-property: background-color;
    transition-duration: var(--wui-duration-lg);
    transition-timing-function: var(--wui-ease-out-power-1);

    &[data-state='loading'] {
      width: 56px;
    }
  }

  .hero-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: var(--wui-spacing-3xs);
    flex-wrap: nowrap;
    min-width: fit-content;

    &:nth-child(1) {
      transform: translateX(-30px);
    }

    &:nth-child(2) {
      transform: translateX(30px);
    }

    &:nth-child(4) {
      transform: translateX(40px);
    }

    transition-property: height;
    transition-duration: var(--wui-duration-md);
    transition-timing-function: var(--wui-ease-out-power-1);
    height: 68px;

    &[data-state='loading'] {
      height: 0px;
    }
  }

  .hero-row-icon {
    opacity: 0.1;
    transition-property: opacity;
    transition-duration: var(--wui-duration-md);
    transition-timing-function: var(--wui-ease-out-power-1);

    &[data-state='loading'] {
      opacity: 0;
    }
  }

  .email-sufixes {
    display: flex;
    flex-direction: row;
    gap: var(--wui-spacing-3xs);
    overflow-x: auto;
    max-width: 100%;
    margin-top: var(--wui-spacing-s);
    margin-bottom: calc(-1 * var(--wui-spacing-m));
    padding-bottom: var(--wui-spacing-m);
    margin-left: calc(-1 * var(--wui-spacing-m));
    margin-right: calc(-1 * var(--wui-spacing-m));
    padding-left: var(--wui-spacing-m);
    padding-right: var(--wui-spacing-m);

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .recent-emails {
    display: flex;
    flex-direction: column;
    padding: var(--wui-spacing-s) 0;
    border-top: 1px solid var(--wui-color-gray-glass-005);
    border-bottom: 1px solid var(--wui-color-gray-glass-005);
  }

  .recent-emails-heading {
    margin-bottom: var(--wui-spacing-s);
  }

  .recent-emails-list-item {
    --wui-color-gray-glass-002: transparent;
  }
`;var _=function(r,e,t,i){var s=arguments.length,n=s<3?e:i===null?i=Object.getOwnPropertyDescriptor(e,t):i,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(r,e,t,i);else for(var o=r.length-1;o>=0;o--)(a=r[o])&&(n=(s<3?a(n):s>3?a(e,t,n):a(e,t))||n);return s>3&&n&&Object.defineProperty(e,t,n),n};const H=["@gmail.com","@outlook.com","@yahoo.com","@hotmail.com","@aol.com","@icloud.com","@zoho.com"];let E=class extends N{constructor(){super(...arguments),this.email=""}render(){const e=H.filter(this.filter.bind(this)).map(this.item.bind(this));return e.length===0?null:c`<div class="email-sufixes">${e}</div>`}filter(e){if(!this.email)return!1;const t=this.email.split("@");if(t.length<2)return!0;const i=t.pop();return e.includes(i)&&e!==`@${i}`}item(e){return c`<wui-button variant="neutral" size="sm" @click=${()=>{const i=this.email.split("@");i.length>1&&i.pop();const s=i[0]+e;this.dispatchEvent(new CustomEvent("change",{detail:s,bubbles:!0,composed:!0}))}}
      >${e}</wui-button
    >`}};E.styles=[A];_([O()],E.prototype,"email",void 0);E=_([$("w3m-email-suffixes-widget")],E);var q=function(r,e,t,i){var s=arguments.length,n=s<3?e:i===null?i=Object.getOwnPropertyDescriptor(e,t):i,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(r,e,t,i);else for(var o=r.length-1;o>=0;o--)(a=r[o])&&(n=(s<3?a(n):s>3?a(e,t,n):a(e,t))||n);return s>3&&n&&Object.defineProperty(e,t,n),n};let S=class extends N{constructor(){super(...arguments),this.emails=[]}render(){return this.emails.length===0?null:c`<div class="recent-emails">
      <wui-text variant="micro-600" color="fg-200" class="recent-emails-heading"
        >Recently used emails</wui-text
      >
      ${this.emails.map(this.item.bind(this))}
    </div>`}item(e){return c`<wui-list-item
      @click=${()=>{this.dispatchEvent(new CustomEvent("select",{detail:e,bubbles:!0,composed:!0}))}}
      ?chevron=${!0}
      icon="mail"
      iconVariant="overlay"
      class="recent-emails-list-item"
    >
      <wui-text variant="paragraph-500" color="fg-100">${e}</wui-text>
    </wui-list-item>`}};S.styles=[A];q([O()],S.prototype,"emails",void 0);S=q([$("w3m-recent-emails-widget")],S);var d=function(r,e,t,i){var s=arguments.length,n=s<3?e:i===null?i=Object.getOwnPropertyDescriptor(e,t):i,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(r,e,t,i);else for(var o=r.length-1;o>=0;o--)(a=r[o])&&(n=(s<3?a(n):s>3?a(e,t,n):a(e,t))||n);return s>3&&n&&Object.defineProperty(e,t,n),n};let l=class extends N{constructor(){super(...arguments),this.email=f.state.data?.email??g.getAccountData()?.user?.email??"",this.address=g.getAccountData()?.address??"",this.loading=!1,this.appName=w.state.metadata?.name??"AppKit",this.siwx=w.state.siwx,this.isRequired=Array.isArray(w.state.remoteFeatures?.emailCapture)&&w.state.remoteFeatures?.emailCapture.includes("required"),this.recentEmails=this.getRecentEmails()}connectedCallback(){(!this.siwx||!(this.siwx instanceof T))&&v.showError("ReownAuthentication is not initialized."),super.connectedCallback()}firstUpdated(){this.loading=!1,this.recentEmails=this.getRecentEmails(),this.email&&this.onSubmit()}render(){return c`
      <wui-flex flexDirection="column" .padding=${["3xs","m","m","m"]} gap="l">
        ${this.hero()} ${this.paragraph()} ${this.emailInput()} ${this.recentEmailsWidget()}
        ${this.footerActions()}
      </wui-flex>
    `}hero(){return c`
      <div class="hero" data-state=${this.loading?"loading":"default"}>
        ${this.heroRow(["id","mail","wallet","x","solana","qrCode"])}
        ${this.heroRow(["mail","farcaster","wallet","discord","mobile","qrCode"])}
        <div class="hero-row">
          ${this.heroIcon("github")} ${this.heroIcon("bank")}
          <wui-icon-box
            size="xl"
            iconSize="xxl"
            iconColor=${this.loading?"fg-100":"accent-100"}
            backgroundColor=${this.loading?"fg-100":"accent-100"}
            icon=${this.loading?"id":"user"}
            isOpaque
            class="hero-main-icon"
            data-state=${this.loading?"loading":"default"}
          >
          </wui-icon-box>
          ${this.heroIcon("id")} ${this.heroIcon("card")}
        </div>
        ${this.heroRow(["google","id","github","verify","apple","mobile"])}
      </div>
    `}heroRow(e){return c`
      <div class="hero-row" data-state=${this.loading?"loading":"default"}>
        ${e.map(this.heroIcon.bind(this))}
      </div>
    `}heroIcon(e){return c`
      <wui-icon-box
        size="xl"
        iconSize="xxl"
        iconColor="fg-100"
        backgroundColor="fg-100"
        icon=${e}
        data-state=${this.loading?"loading":"default"}
        isOpaque
        class="hero-row-icon"
      >
      </wui-icon-box>
    `}paragraph(){return this.loading?c`
        <wui-text variant="paragraph-400" color="fg-200" align="center"
          >We are verifying your account with email
          <wui-text variant="paragraph-600" color="accent-100">${this.email}</wui-text> and address
          <wui-text variant="paragraph-600" color="fg-100">
            ${M.getTruncateString({string:this.address,charsEnd:4,charsStart:4,truncate:"middle"})} </wui-text
          >, please wait a moment.</wui-text
        >
      `:this.isRequired?c`
        <wui-text variant="paragraph-600" color="fg-100" align="center">
          ${this.appName} requires your email for authentication.
        </wui-text>
      `:c`
      <wui-flex flexDirection="column" gap="xs" alignItems="center">
        <wui-text variant="paragraph-600" color="fg-100" align="center" size>
          ${this.appName} would like to collect your email.
        </wui-text>

        <wui-text variant="small-400" color="fg-200" align="center">
          Don't worry, it's optional&mdash;you can skip this step.
        </wui-text>
      </wui-flex>
    `}emailInput(){if(this.loading)return null;const e=i=>{i.key==="Enter"&&this.onSubmit()},t=i=>{this.email=i.detail};return c`
      <wui-flex flexDirection="column">
        <wui-email-input
          .value=${this.email}
          .disabled=${this.loading}
          @inputChange=${t}
          @keydown=${e}
        ></wui-email-input>

        <w3m-email-suffixes-widget
          .email=${this.email}
          @change=${t}
        ></w3m-email-suffixes-widget>
      </wui-flex>
    `}recentEmailsWidget(){if(this.recentEmails.length===0||this.loading)return null;const e=t=>{this.email=t.detail,this.onSubmit()};return c`
      <w3m-recent-emails-widget
        .emails=${this.recentEmails}
        @select=${e}
      ></w3m-recent-emails-widget>
    `}footerActions(){return c`
      <wui-flex flexDirection="row" fullWidth gap="s">
        ${this.isRequired?null:c`<wui-button
              size="lg"
              variant="neutral"
              fullWidth
              .disabled=${this.loading}
              @click=${this.onSkip.bind(this)}
              >Skip this step</wui-button
            >`}

        <wui-button
          size="lg"
          variant="main"
          type="submit"
          fullWidth
          .disabled=${!this.email||!this.isValidEmail(this.email)}
          .loading=${this.loading}
          @click=${this.onSubmit.bind(this)}
        >
          Continue
        </wui-button>
      </wui-flex>
    `}async onSubmit(){const e=g.getActiveCaipAddress();if(!e)throw new Error("Account is not connected.");if(!this.isValidEmail(this.email)){v.showError("Please provide a valid email.");return}try{this.loading=!0;const t=await this.siwx.requestEmailOtp({email:this.email,account:e});this.pushRecentEmail(this.email),t.uuid===null?f.replace("SIWXSignMessage"):f.replace("DataCaptureOtpConfirm",{email:this.email})}catch{v.showError("Failed to send email OTP"),this.loading=!1}}onSkip(){f.replace("SIWXSignMessage")}getRecentEmails(){const e=m.getItem(b.RECENT_EMAILS);return(e?e.split(","):[]).filter(this.isValidEmail.bind(this)).slice(0,3)}pushRecentEmail(e){const t=this.getRecentEmails(),i=Array.from(new Set([e,...t])).slice(0,3);m.setItem(b.RECENT_EMAILS,i.join(","))}isValidEmail(e){return/^\S+@\S+\.\S+$/u.test(e)}};l.styles=[A];d([u()],l.prototype,"email",void 0);d([u()],l.prototype,"address",void 0);d([u()],l.prototype,"loading",void 0);d([u()],l.prototype,"appName",void 0);d([u()],l.prototype,"siwx",void 0);d([u()],l.prototype,"isRequired",void 0);d([u()],l.prototype,"recentEmails",void 0);l=d([$("w3m-data-capture-view")],l);var D=function(r,e,t,i){var s=arguments.length,n=s<3?e:i===null?i=Object.getOwnPropertyDescriptor(e,t):i,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(r,e,t,i);else for(var o=r.length-1;o>=0;o--)(a=r[o])&&(n=(s<3?a(n):s>3?a(e,t,n):a(e,t))||n);return s>3&&n&&Object.defineProperty(e,t,n),n};let I=class extends R{constructor(){super(...arguments),this.siwx=w.state.siwx,this.onOtpSubmit=async e=>{await this.siwx.confirmEmailOtp({code:e}),f.replace("SIWXSignMessage")},this.onOtpResend=async e=>{const t=g.getAccountData();if(!t?.caipAddress)throw new Error("No account data found");await this.siwx.requestEmailOtp({email:e,account:t.caipAddress})}}connectedCallback(){(!this.siwx||!(this.siwx instanceof T))&&v.showError("ReownAuthentication is not initialized."),super.connectedCallback()}shouldSubmitOnOtpChange(){return this.otp.length===R.OTP_LENGTH}};D([u()],I.prototype,"siwx",void 0);I=D([$("w3m-data-capture-otp-confirm-view")],I);export{I as W3mDataCaptureOtpConfirmView,l as W3mDataCaptureView,E as W3mEmailSuffixesWidget,S as W3mRecentEmailsWidget};
