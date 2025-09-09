import{aj as j,aC as S,L as O,K as y,Q as g,$ as h,aD as q,aE as B,D as z,G as X,J,a0 as P,ap as x,R as _,Y as E,T as G,i as W,a as F,x as d,a9 as v,aa as w,c as H,a8 as Z,O as Y,a6 as Q}from"./index-Cr5N_0pd.js";const r={INVALID_PAYMENT_CONFIG:"INVALID_PAYMENT_CONFIG",INVALID_RECIPIENT:"INVALID_RECIPIENT",INVALID_ASSET:"INVALID_ASSET",INVALID_AMOUNT:"INVALID_AMOUNT",UNKNOWN_ERROR:"UNKNOWN_ERROR",UNABLE_TO_INITIATE_PAYMENT:"UNABLE_TO_INITIATE_PAYMENT",INVALID_CHAIN_NAMESPACE:"INVALID_CHAIN_NAMESPACE",GENERIC_PAYMENT_ERROR:"GENERIC_PAYMENT_ERROR",UNABLE_TO_GET_EXCHANGES:"UNABLE_TO_GET_EXCHANGES",ASSET_NOT_SUPPORTED:"ASSET_NOT_SUPPORTED",UNABLE_TO_GET_PAY_URL:"UNABLE_TO_GET_PAY_URL",UNABLE_TO_GET_BUY_STATUS:"UNABLE_TO_GET_BUY_STATUS"},N={[r.INVALID_PAYMENT_CONFIG]:"Invalid payment configuration",[r.INVALID_RECIPIENT]:"Invalid recipient address",[r.INVALID_ASSET]:"Invalid asset specified",[r.INVALID_AMOUNT]:"Invalid payment amount",[r.UNKNOWN_ERROR]:"Unknown payment error occurred",[r.UNABLE_TO_INITIATE_PAYMENT]:"Unable to initiate payment",[r.INVALID_CHAIN_NAMESPACE]:"Invalid chain namespace",[r.GENERIC_PAYMENT_ERROR]:"Unable to process payment",[r.UNABLE_TO_GET_EXCHANGES]:"Unable to get exchanges",[r.ASSET_NOT_SUPPORTED]:"Asset not supported by the selected exchange",[r.UNABLE_TO_GET_PAY_URL]:"Unable to get payment URL",[r.UNABLE_TO_GET_BUY_STATUS]:"Unable to get buy status"};class c extends Error{get message(){return N[this.code]}constructor(e,a){super(N[e]),this.name="AppKitPayError",this.code=e,this.details=a,Error.captureStackTrace&&Error.captureStackTrace(this,c)}}const ee="https://rpc.walletconnect.org/v1/json-rpc";class te extends Error{}function ne(){const n=j.getSnapshot().projectId;return`${ee}?projectId=${n}`}async function L(n,e){const a=ne(),o=await(await fetch(a,{method:"POST",body:JSON.stringify({jsonrpc:"2.0",id:1,method:n,params:e}),headers:{"Content-Type":"application/json"}})).json();if(o.error)throw new te(o.error.message);return o}async function V(n){return(await L("reown_getExchanges",n)).result}async function ae(n){return(await L("reown_getExchangePayUrl",n)).result}async function se(n){return(await L("reown_getExchangeBuyStatus",n)).result}const re=["eip155","solana"],ie={eip155:{native:{assetNamespace:"slip44",assetReference:"60"},defaultTokenNamespace:"erc20"},solana:{native:{assetNamespace:"slip44",assetReference:"501"},defaultTokenNamespace:"token"}};function R(n,e){const{chainNamespace:a,chainId:s}=S.parseCaipNetworkId(n),i=ie[a];if(!i)throw new Error(`Unsupported chain namespace for CAIP-19 formatting: ${a}`);let o=i.native.assetNamespace,l=i.native.assetReference;return e!=="native"&&(o=i.defaultTokenNamespace,l=e),`${`${a}:${s}`}/${o}:${l}`}function oe(n){const{chainNamespace:e}=S.parseCaipNetworkId(n);return re.includes(e)}async function ce(n){const{paymentAssetNetwork:e,activeCaipNetwork:a,approvedCaipNetworkIds:s,requestedCaipNetworks:i}=n,l=O.sortRequestedNetworks(s,i).find(I=>I.caipNetworkId===e);if(!l)throw new c(r.INVALID_PAYMENT_CONFIG);if(l.caipNetworkId===a.caipNetworkId)return;const p=y.getNetworkProp("supportsAllNetworks",l.chainNamespace);if(!(s?.includes(l.caipNetworkId)||p))throw new c(r.INVALID_PAYMENT_CONFIG);try{await y.switchActiveNetwork(l)}catch(I){throw new c(r.GENERIC_PAYMENT_ERROR,I)}}async function ue(n,e,a){if(e!==g.CHAIN.EVM)throw new c(r.INVALID_CHAIN_NAMESPACE);if(!a.fromAddress)throw new c(r.INVALID_PAYMENT_CONFIG,"fromAddress is required for native EVM payments.");const s=typeof a.amount=="string"?parseFloat(a.amount):a.amount;if(isNaN(s))throw new c(r.INVALID_PAYMENT_CONFIG);const i=n.metadata?.decimals??18,o=h.parseUnits(s.toString(),i);if(typeof o!="bigint")throw new c(r.GENERIC_PAYMENT_ERROR);return await h.sendTransaction({chainNamespace:e,to:a.recipient,address:a.fromAddress,value:o,data:"0x"})??void 0}async function le(n,e){if(!e.fromAddress)throw new c(r.INVALID_PAYMENT_CONFIG,"fromAddress is required for ERC20 EVM payments.");const a=n.asset,s=e.recipient,i=Number(n.metadata.decimals),o=h.parseUnits(e.amount.toString(),i);if(o===void 0)throw new c(r.GENERIC_PAYMENT_ERROR);return await h.writeContract({fromAddress:e.fromAddress,tokenAddress:a,args:[s,o],method:"transfer",abi:q.getERC20Abi(a),chainNamespace:g.CHAIN.EVM})??void 0}async function de(n,e){if(n!==g.CHAIN.SOLANA)throw new c(r.INVALID_CHAIN_NAMESPACE);if(!e.fromAddress)throw new c(r.INVALID_PAYMENT_CONFIG,"fromAddress is required for Solana payments.");const a=typeof e.amount=="string"?parseFloat(e.amount):e.amount;if(isNaN(a)||a<=0)throw new c(r.INVALID_PAYMENT_CONFIG,"Invalid payment amount.");try{if(!B.getProvider(n))throw new c(r.GENERIC_PAYMENT_ERROR,"No Solana provider available.");const i=await h.sendTransaction({chainNamespace:g.CHAIN.SOLANA,to:e.recipient,value:a,tokenMint:e.tokenMint});if(!i)throw new c(r.GENERIC_PAYMENT_ERROR,"Transaction failed.");return i}catch(s){throw s instanceof c?s:new c(r.GENERIC_PAYMENT_ERROR,`Solana payment failed: ${s}`)}}const $=0,k="unknown",t=z({paymentAsset:{network:"eip155:1",asset:"0x0",metadata:{name:"0x0",symbol:"0x0",decimals:0}},recipient:"0x0",amount:0,isConfigured:!1,error:null,isPaymentInProgress:!1,exchanges:[],isLoading:!1,openInNewTab:!0,redirectUrl:void 0,payWithExchange:void 0,currentPayment:void 0,analyticsSet:!1,paymentId:void 0}),u={state:t,subscribe(n){return X(t,()=>n(t))},subscribeKey(n,e){return J(t,n,e)},async handleOpenPay(n){this.resetState(),this.setPaymentConfig(n),this.subscribeEvents(),this.initializeAnalytics(),t.isConfigured=!0,P.sendEvent({type:"track",event:"PAY_MODAL_OPEN",properties:{exchanges:t.exchanges,configuration:{network:t.paymentAsset.network,asset:t.paymentAsset.asset,recipient:t.recipient,amount:t.amount}}}),await x.open({view:"Pay"})},resetState(){t.paymentAsset={network:"eip155:1",asset:"0x0",metadata:{name:"0x0",symbol:"0x0",decimals:0}},t.recipient="0x0",t.amount=0,t.isConfigured=!1,t.error=null,t.isPaymentInProgress=!1,t.isLoading=!1,t.currentPayment=void 0},setPaymentConfig(n){if(!n.paymentAsset)throw new c(r.INVALID_PAYMENT_CONFIG);try{t.paymentAsset=n.paymentAsset,t.recipient=n.recipient,t.amount=n.amount,t.openInNewTab=n.openInNewTab??!0,t.redirectUrl=n.redirectUrl,t.payWithExchange=n.payWithExchange,t.error=null}catch(e){throw new c(r.INVALID_PAYMENT_CONFIG,e.message)}},getPaymentAsset(){return t.paymentAsset},getExchanges(){return t.exchanges},async fetchExchanges(){try{t.isLoading=!0;const n=await V({page:$,asset:R(t.paymentAsset.network,t.paymentAsset.asset),amount:t.amount.toString()});t.exchanges=n.exchanges.slice(0,2)}catch{throw _.showError(N.UNABLE_TO_GET_EXCHANGES),new c(r.UNABLE_TO_GET_EXCHANGES)}finally{t.isLoading=!1}},async getAvailableExchanges(n){try{const e=n?.asset&&n?.network?R(n.network,n.asset):void 0;return await V({page:n?.page??$,asset:e,amount:n?.amount?.toString()})}catch{throw new c(r.UNABLE_TO_GET_EXCHANGES)}},async getPayUrl(n,e,a=!1){try{const s=Number(e.amount),i=await ae({exchangeId:n,asset:R(e.network,e.asset),amount:s.toString(),recipient:`${e.network}:${e.recipient}`});return P.sendEvent({type:"track",event:"PAY_EXCHANGE_SELECTED",properties:{exchange:{id:n},configuration:{network:e.network,asset:e.asset,recipient:e.recipient,amount:s},currentPayment:{type:"exchange",exchangeId:n},headless:a}}),a&&(this.initiatePayment(),P.sendEvent({type:"track",event:"PAY_INITIATED",properties:{paymentId:t.paymentId||k,configuration:{network:e.network,asset:e.asset,recipient:e.recipient,amount:s},currentPayment:{type:"exchange",exchangeId:n}}})),i}catch(s){throw s instanceof Error&&s.message.includes("is not supported")?new c(r.ASSET_NOT_SUPPORTED):new Error(s.message)}},async openPayUrl(n,e,a=!1){try{const s=await this.getPayUrl(n.exchangeId,e,a);if(!s)throw new c(r.UNABLE_TO_GET_PAY_URL);const o=n.openInNewTab??!0?"_blank":"_self";return O.openHref(s.url,o),s}catch(s){throw s instanceof c?t.error=s.message:t.error=N.GENERIC_PAYMENT_ERROR,new c(r.UNABLE_TO_GET_PAY_URL)}},subscribeEvents(){t.isConfigured||(h.subscribeKey("connections",n=>{n.size>0&&this.handlePayment()}),E.subscribeKey("caipAddress",n=>{const e=h.hasAnyConnection(g.CONNECTOR_ID.WALLET_CONNECT);n&&(e?setTimeout(()=>{this.handlePayment()},100):this.handlePayment())}))},async handlePayment(){t.currentPayment={type:"wallet",status:"IN_PROGRESS"};const n=E.state.caipAddress;if(!n)return;const{chainId:e,address:a}=S.parseCaipAddress(n),s=y.state.activeChain;if(!a||!e||!s||!B.getProvider(s))return;const o=y.state.activeCaipNetwork;if(o&&!t.isPaymentInProgress)try{this.initiatePayment();const l=y.getAllRequestedCaipNetworks(),p=y.getAllApprovedCaipNetworkIds();switch(await ce({paymentAssetNetwork:t.paymentAsset.network,activeCaipNetwork:o,approvedCaipNetworkIds:p,requestedCaipNetworks:l}),await x.open({view:"PayLoading"}),s){case g.CHAIN.EVM:t.paymentAsset.asset==="native"&&(t.currentPayment.result=await ue(t.paymentAsset,s,{recipient:t.recipient,amount:t.amount,fromAddress:a})),t.paymentAsset.asset.startsWith("0x")&&(t.currentPayment.result=await le(t.paymentAsset,{recipient:t.recipient,amount:t.amount,fromAddress:a})),t.currentPayment.status="SUCCESS";break;case g.CHAIN.SOLANA:t.currentPayment.result=await de(s,{recipient:t.recipient,amount:t.amount,fromAddress:a,tokenMint:t.paymentAsset.asset==="native"?void 0:t.paymentAsset.asset}),t.currentPayment.status="SUCCESS";break;default:throw new c(r.INVALID_CHAIN_NAMESPACE)}}catch(l){l instanceof c?t.error=l.message:t.error=N.GENERIC_PAYMENT_ERROR,t.currentPayment.status="FAILED",_.showError(t.error)}finally{t.isPaymentInProgress=!1}},getExchangeById(n){return t.exchanges.find(e=>e.id===n)},validatePayConfig(n){const{paymentAsset:e,recipient:a,amount:s}=n;if(!e)throw new c(r.INVALID_PAYMENT_CONFIG);if(!a)throw new c(r.INVALID_RECIPIENT);if(!e.asset)throw new c(r.INVALID_ASSET);if(s==null||s<=0)throw new c(r.INVALID_AMOUNT)},handlePayWithWallet(){const n=E.state.caipAddress;if(!n){G.push("Connect");return}const{chainId:e,address:a}=S.parseCaipAddress(n),s=y.state.activeChain;if(!a||!e||!s){G.push("Connect");return}this.handlePayment()},async handlePayWithExchange(n){try{t.currentPayment={type:"exchange",exchangeId:n};const{network:e,asset:a}=t.paymentAsset,s={network:e,asset:a,amount:t.amount,recipient:t.recipient},i=await this.getPayUrl(n,s);if(!i)throw new c(r.UNABLE_TO_INITIATE_PAYMENT);return t.currentPayment.sessionId=i.sessionId,t.currentPayment.status="IN_PROGRESS",t.currentPayment.exchangeId=n,this.initiatePayment(),{url:i.url,openInNewTab:t.openInNewTab}}catch(e){return e instanceof c?t.error=e.message:t.error=N.GENERIC_PAYMENT_ERROR,t.isPaymentInProgress=!1,_.showError(t.error),null}},async getBuyStatus(n,e){try{const a=await se({sessionId:e,exchangeId:n});return(a.status==="SUCCESS"||a.status==="FAILED")&&P.sendEvent({type:"track",event:a.status==="SUCCESS"?"PAY_SUCCESS":"PAY_ERROR",properties:{paymentId:t.paymentId||k,configuration:{network:t.paymentAsset.network,asset:t.paymentAsset.asset,recipient:t.recipient,amount:t.amount},currentPayment:{type:"exchange",exchangeId:t.currentPayment?.exchangeId,sessionId:t.currentPayment?.sessionId,result:a.txHash}}}),a}catch{throw new c(r.UNABLE_TO_GET_BUY_STATUS)}},async updateBuyStatus(n,e){try{const a=await this.getBuyStatus(n,e);t.currentPayment&&(t.currentPayment.status=a.status,t.currentPayment.result=a.txHash),(a.status==="SUCCESS"||a.status==="FAILED")&&(t.isPaymentInProgress=!1)}catch{throw new c(r.UNABLE_TO_GET_BUY_STATUS)}},initiatePayment(){t.isPaymentInProgress=!0,t.paymentId=crypto.randomUUID()},initializeAnalytics(){t.analyticsSet||(t.analyticsSet=!0,this.subscribeKey("isPaymentInProgress",n=>{if(t.currentPayment?.status&&t.currentPayment.status!=="UNKNOWN"){const e={IN_PROGRESS:"PAY_INITIATED",SUCCESS:"PAY_SUCCESS",FAILED:"PAY_ERROR"}[t.currentPayment.status];P.sendEvent({type:"track",event:e,properties:{paymentId:t.paymentId||k,configuration:{network:t.paymentAsset.network,asset:t.paymentAsset.asset,recipient:t.recipient,amount:t.amount},currentPayment:{type:t.currentPayment.type,exchangeId:t.currentPayment.exchangeId,sessionId:t.currentPayment.sessionId,result:t.currentPayment.result}}})}}))}},pe=W`
  wui-separator {
    margin: var(--wui-spacing-m) calc(var(--wui-spacing-m) * -1) var(--wui-spacing-xs)
      calc(var(--wui-spacing-m) * -1);
    width: calc(100% + var(--wui-spacing-s) * 2);
  }

  .token-display {
    padding: var(--wui-spacing-s) var(--wui-spacing-m);
    border-radius: var(--wui-border-radius-s);
    background-color: var(--wui-color-bg-125);
    margin-top: var(--wui-spacing-s);
    margin-bottom: var(--wui-spacing-s);
  }

  .token-display wui-text {
    text-transform: none;
  }

  wui-loading-spinner {
    padding: var(--wui-spacing-xs);
  }
`;var f=function(n,e,a,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,a):s,l;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,a,s);else for(var p=n.length-1;p>=0;p--)(l=n[p])&&(o=(i<3?l(o):i>3?l(e,a,o):l(e,a))||o);return i>3&&o&&Object.defineProperty(e,a,o),o};let m=class extends F{constructor(){super(),this.unsubscribe=[],this.amount="",this.tokenSymbol="",this.networkName="",this.exchanges=u.state.exchanges,this.isLoading=u.state.isLoading,this.loadingExchangeId=null,this.connectedWalletInfo=E.state.connectedWalletInfo,this.initializePaymentDetails(),this.unsubscribe.push(u.subscribeKey("exchanges",e=>this.exchanges=e)),this.unsubscribe.push(u.subscribeKey("isLoading",e=>this.isLoading=e)),this.unsubscribe.push(E.subscribe(e=>this.connectedWalletInfo=e.connectedWalletInfo)),u.fetchExchanges()}get isWalletConnected(){return E.state.status==="connected"}render(){return d`
      <wui-flex flexDirection="column">
        <wui-flex flexDirection="column" .padding=${["0","l","l","l"]} gap="s">
          ${this.renderPaymentHeader()}

          <wui-flex flexDirection="column" gap="s">
            ${this.renderPayWithWallet()} ${this.renderExchangeOptions()}
          </wui-flex>
        </wui-flex>
      </wui-flex>
    `}initializePaymentDetails(){const e=u.getPaymentAsset();this.networkName=e.network,this.tokenSymbol=e.metadata.symbol,this.amount=u.state.amount.toString()}renderPayWithWallet(){return oe(this.networkName)?d`<wui-flex flexDirection="column" gap="s">
        ${this.isWalletConnected?this.renderConnectedView():this.renderDisconnectedView()}
      </wui-flex>
      <wui-separator text="or"></wui-separator>`:d``}renderPaymentHeader(){let e=this.networkName;if(this.networkName){const s=y.getAllRequestedCaipNetworks().find(i=>i.caipNetworkId===this.networkName);s&&(e=s.name)}return d`
      <wui-flex flexDirection="column" alignItems="center">
        <wui-flex alignItems="center" gap="xs">
          <wui-text variant="large-700" color="fg-100">${this.amount||"0.0000"}</wui-text>
          <wui-flex class="token-display" alignItems="center" gap="xxs">
            <wui-text variant="paragraph-600" color="fg-100">
              ${this.tokenSymbol||"Unknown Asset"}
            </wui-text>
            ${e?d`
                  <wui-text variant="small-500" color="fg-200"> on ${e} </wui-text>
                `:""}
          </wui-flex>
        </wui-flex>
      </wui-flex>
    `}renderConnectedView(){const e=this.connectedWalletInfo?.name||"connected wallet";return d`
      <wui-list-item
        @click=${this.onWalletPayment}
        ?chevron=${!0}
        data-testid="wallet-payment-option"
      >
        <wui-flex alignItems="center" gap="s">
          <wui-wallet-image
            size="sm"
            imageSrc=${v(this.connectedWalletInfo?.icon)}
            name=${v(this.connectedWalletInfo?.name)}
          ></wui-wallet-image>
          <wui-text variant="paragraph-500" color="inherit">Pay with ${e}</wui-text>
        </wui-flex>
      </wui-list-item>

      <wui-list-item
        variant="icon"
        iconVariant="overlay"
        icon="disconnect"
        @click=${this.onDisconnect}
        data-testid="disconnect-button"
        ?chevron=${!1}
      >
        <wui-text variant="paragraph-500" color="fg-200">Disconnect</wui-text>
      </wui-list-item>
    `}renderDisconnectedView(){return d`<wui-list-item
      variant="icon"
      iconVariant="overlay"
      icon="walletPlaceholder"
      @click=${this.onWalletPayment}
      ?chevron=${!0}
      data-testid="wallet-payment-option"
    >
      <wui-text variant="paragraph-500" color="inherit">Pay from wallet</wui-text>
    </wui-list-item>`}renderExchangeOptions(){return this.isLoading?d`<wui-flex justifyContent="center" alignItems="center">
        <wui-spinner size="md"></wui-spinner>
      </wui-flex>`:this.exchanges.length===0?d`<wui-flex justifyContent="center" alignItems="center">
        <wui-text variant="paragraph-500" color="fg-100">No exchanges available</wui-text>
      </wui-flex>`:this.exchanges.map(e=>d`
        <wui-list-item
          @click=${()=>this.onExchangePayment(e.id)}
          data-testid="exchange-option-${e.id}"
          ?chevron=${!0}
          ?disabled=${this.loadingExchangeId!==null}
        >
          <wui-flex alignItems="center" gap="s">
            ${this.loadingExchangeId===e.id?d`<wui-loading-spinner color="accent-100" size="md"></wui-loading-spinner>`:d`<wui-wallet-image
                  size="sm"
                  imageSrc=${v(e.imageUrl)}
                  name=${e.name}
                ></wui-wallet-image>`}
            <wui-text flexGrow="1" variant="paragraph-500" color="inherit"
              >Pay with ${e.name} <wui-spinner size="sm" color="fg-200"></wui-spinner
            ></wui-text>
          </wui-flex>
        </wui-list-item>
      `)}onWalletPayment(){u.handlePayWithWallet()}async onExchangePayment(e){try{this.loadingExchangeId=e;const a=await u.handlePayWithExchange(e);a&&(await x.open({view:"PayLoading"}),O.openHref(a.url,a.openInNewTab?"_blank":"_self"))}catch(a){console.error("Failed to pay with exchange",a),_.showError("Failed to pay with exchange")}finally{this.loadingExchangeId=null}}async onDisconnect(e){e.stopPropagation();try{await h.disconnect()}catch{console.error("Failed to disconnect"),_.showError("Failed to disconnect")}}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}};m.styles=pe;f([w()],m.prototype,"amount",void 0);f([w()],m.prototype,"tokenSymbol",void 0);f([w()],m.prototype,"networkName",void 0);f([w()],m.prototype,"exchanges",void 0);f([w()],m.prototype,"isLoading",void 0);f([w()],m.prototype,"loadingExchangeId",void 0);f([w()],m.prototype,"connectedWalletInfo",void 0);m=f([H("w3m-pay-view")],m);const me=W`
  :host {
    display: block;
    height: 100%;
    width: 100%;
  }

  wui-flex:first-child:not(:only-child) {
    position: relative;
  }

  wui-loading-thumbnail {
    position: absolute;
  }
`;var b=function(n,e,a,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,a):s,l;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,a,s);else for(var p=n.length-1;p>=0;p--)(l=n[p])&&(o=(i<3?l(o):i>3?l(e,a,o):l(e,a))||o);return i>3&&o&&Object.defineProperty(e,a,o),o};const we=4e3;let A=class extends F{constructor(){super(),this.loadingMessage="",this.subMessage="",this.paymentState="in-progress",this.paymentState=u.state.isPaymentInProgress?"in-progress":"completed",this.updateMessages(),this.setupSubscription(),this.setupExchangeSubscription()}disconnectedCallback(){clearInterval(this.exchangeSubscription)}render(){return d`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["xl","xl","xl","xl"]}
        gap="xl"
      >
        <wui-flex justifyContent="center" alignItems="center"> ${this.getStateIcon()} </wui-flex>
        <wui-flex flexDirection="column" alignItems="center" gap="xs">
          <wui-text align="center" variant="paragraph-500" color="fg-100">
            ${this.loadingMessage}
          </wui-text>
          <wui-text align="center" variant="small-400" color="fg-200">
            ${this.subMessage}
          </wui-text>
        </wui-flex>
      </wui-flex>
    `}updateMessages(){switch(this.paymentState){case"completed":this.loadingMessage="Payment completed",this.subMessage="Your transaction has been successfully processed";break;case"error":this.loadingMessage="Payment failed",this.subMessage="There was an error processing your transaction";break;case"in-progress":default:u.state.currentPayment?.type==="exchange"?(this.loadingMessage="Payment initiated",this.subMessage="Please complete the payment on the exchange"):(this.loadingMessage="Awaiting payment confirmation",this.subMessage="Please confirm the payment transaction in your wallet");break}}getStateIcon(){switch(this.paymentState){case"completed":return this.successTemplate();case"error":return this.errorTemplate();case"in-progress":default:return this.loaderTemplate()}}setupExchangeSubscription(){u.state.currentPayment?.type==="exchange"&&(this.exchangeSubscription=setInterval(async()=>{const e=u.state.currentPayment?.exchangeId,a=u.state.currentPayment?.sessionId;e&&a&&(await u.updateBuyStatus(e,a),u.state.currentPayment?.status==="SUCCESS"&&clearInterval(this.exchangeSubscription))},we))}setupSubscription(){u.subscribeKey("isPaymentInProgress",e=>{!e&&this.paymentState==="in-progress"&&(u.state.error||!u.state.currentPayment?.result?this.paymentState="error":this.paymentState="completed",this.updateMessages(),setTimeout(()=>{h.state.status!=="disconnected"&&x.close()},3e3))}),u.subscribeKey("error",e=>{e&&this.paymentState==="in-progress"&&(this.paymentState="error",this.updateMessages())})}loaderTemplate(){const e=Z.state.themeVariables["--w3m-border-radius-master"],a=e?parseInt(e.replace("px",""),10):4,s=this.getPaymentIcon();return d`
      <wui-flex justifyContent="center" alignItems="center" style="position: relative;">
        ${s?d`<wui-wallet-image size="lg" imageSrc=${s}></wui-wallet-image>`:null}
        <wui-loading-thumbnail radius=${a*9}></wui-loading-thumbnail>
      </wui-flex>
    `}getPaymentIcon(){const e=u.state.currentPayment;if(e){if(e.type==="exchange"){const a=e.exchangeId;if(a)return u.getExchangeById(a)?.imageUrl}if(e.type==="wallet"){const a=E.state.connectedWalletInfo?.icon;if(a)return a;const s=y.state.activeChain;if(!s)return;const i=Y.getConnectorId(s);if(!i)return;const o=Y.getConnectorById(i);return o?Q.getConnectorImage(o):void 0}}}successTemplate(){return d`<wui-icon size="xl" color="success-100" name="checkmark"></wui-icon>`}errorTemplate(){return d`<wui-icon size="xl" color="error-100" name="close"></wui-icon>`}};A.styles=me;b([w()],A.prototype,"loadingMessage",void 0);b([w()],A.prototype,"subMessage",void 0);b([w()],A.prototype,"paymentState",void 0);A=b([H("w3m-pay-loading-view")],A);const ye=3e5;async function he(n){return u.handleOpenPay(n)}async function Ae(n,e=ye){if(e<=0)throw new c(r.INVALID_PAYMENT_CONFIG,"Timeout must be greater than 0");try{await he(n)}catch(a){throw a instanceof c?a:new c(r.UNABLE_TO_INITIATE_PAYMENT,a.message)}return new Promise((a,s)=>{let i=!1;const o=setTimeout(()=>{i||(i=!0,T(),s(new c(r.GENERIC_PAYMENT_ERROR,"Payment timeout")))},e);function l(){if(i)return;const C=u.state.currentPayment,U=u.state.error,K=u.state.isPaymentInProgress;if(C?.status==="SUCCESS"){i=!0,T(),clearTimeout(o),a({success:!0,result:C.result});return}if(C?.status==="FAILED"){i=!0,T(),clearTimeout(o),a({success:!1,error:U||"Payment failed"});return}U&&!K&&!C&&(i=!0,T(),clearTimeout(o),a({success:!1,error:U}))}const p=D("currentPayment",l),M=D("error",l),I=D("isPaymentInProgress",l),T=fe([p,M,I]);l()})}function Ie(){return u.getExchanges()}function Pe(){return u.state.currentPayment?.result}function _e(){return u.state.error}function Te(){return u.state.isPaymentInProgress}function D(n,e){return u.subscribeKey(n,e)}function fe(n){return()=>{n.forEach(e=>{try{e()}catch{}})}}const Ce={network:"eip155:8453",asset:"native",metadata:{name:"Ethereum",symbol:"ETH",decimals:18}},Se={network:"eip155:8453",asset:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",metadata:{name:"USD Coin",symbol:"USDC",decimals:6}},xe={network:"eip155:84532",asset:"native",metadata:{name:"Ethereum",symbol:"ETH",decimals:18}},be={network:"eip155:1",asset:"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",metadata:{name:"USD Coin",symbol:"USDC",decimals:6}},Ue={network:"eip155:10",asset:"0x0b2c639c533813f4aa9d7837caf62653d097ff85",metadata:{name:"USD Coin",symbol:"USDC",decimals:6}},ve={network:"eip155:42161",asset:"0xaf88d065e77c8cC2239327C5EDb3A432268e5831",metadata:{name:"USD Coin",symbol:"USDC",decimals:6}},Re={network:"eip155:137",asset:"0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",metadata:{name:"USD Coin",symbol:"USDC",decimals:6}},ke={network:"solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",asset:"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",metadata:{name:"USD Coin",symbol:"USDC",decimals:6}},De={network:"eip155:1",asset:"0xdAC17F958D2ee523a2206206994597C13D831ec7",metadata:{name:"Tether USD",symbol:"USDT",decimals:6}},Oe={network:"eip155:10",asset:"0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",metadata:{name:"Tether USD",symbol:"USDT",decimals:6}},Le={network:"eip155:42161",asset:"0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",metadata:{name:"Tether USD",symbol:"USDT",decimals:6}},Me={network:"eip155:137",asset:"0xc2132d05d31c914a87c6611c10748aeb04b58e8f",metadata:{name:"Tether USD",symbol:"USDT",decimals:6}},Ge={network:"solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",asset:"Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",metadata:{name:"Tether USD",symbol:"USDT",decimals:6}};export{A as W3mPayLoadingView,m as W3mPayView,ve as arbitrumUSDC,Le as arbitrumUSDT,Ce as baseETH,xe as baseSepoliaETH,Se as baseUSDC,be as ethereumUSDC,De as ethereumUSDT,Ie as getExchanges,Te as getIsPaymentInProgress,_e as getPayError,Pe as getPayResult,he as openPay,Ue as optimismUSDC,Oe as optimismUSDT,Ae as pay,Re as polygonUSDC,Me as polygonUSDT,ke as solanaUSDC,Ge as solanaUSDT};
