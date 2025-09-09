import{i as f,a,x as d,c as u}from"./index-Cr5N_0pd.js";const w=f`
  :host > wui-flex:first-child {
    height: 500px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
  }

  :host > wui-flex:first-child::-webkit-scrollbar {
    display: none;
  }
`;var m=function(n,t,i,l){var o=arguments.length,e=o<3?t:l===null?l=Object.getOwnPropertyDescriptor(t,i):l,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")e=Reflect.decorate(n,t,i,l);else for(var c=n.length-1;c>=0;c--)(r=n[c])&&(e=(o<3?r(e):o>3?r(t,i,e):r(t,i))||e);return o>3&&e&&Object.defineProperty(t,i,e),e};let s=class extends a{render(){return d`
      <wui-flex flexDirection="column" .padding=${["0","m","m","m"]} gap="s">
        <w3m-activity-list page="activity"></w3m-activity-list>
      </wui-flex>
    `}};s.styles=w;s=m([u("w3m-transactions-view")],s);export{s as W3mTransactionsView};
