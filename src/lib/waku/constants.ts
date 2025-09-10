/**
 * Single content topic for all message types
 * Different message types are parsed from the message content itself
 */
export const CONTENT_TOPIC = '/opchan-demo-1/1/messages/proto';

/**
 * Bootstrap nodes for the Waku network
 * These are public Waku nodes that our node will connect to on startup
 */
export const BOOTSTRAP_NODES = {
  '42': [
    '/dns4/waku-test.bloxy.one/tcp/8095/wss/p2p/16Uiu2HAmSZbDB7CusdRhgkD81VssRjQV5ZH13FbzCGcdnbbh6VwZ',
    '/dns4/node-01.do-ams3.waku.sandbox.status.im/tcp/30303/p2p/16Uiu2HAmNaeL4p3WEYzC9mgXBmBWSgWjPHRvatZTXnp8Jgv3iKsb',
    '/dns4/vps-aaa00d52.vps.ovh.ca/tcp/8000/wss/p2p/16Uiu2HAm9PftGgHZwWE3wzdMde4m3kT2eYJFXLZfGoSED3gysofk',
  ],
};
