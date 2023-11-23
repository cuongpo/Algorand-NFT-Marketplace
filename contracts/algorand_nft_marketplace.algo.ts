import { Contract } from '@algorandfoundation/tealscript';

type collectionData = {
  name: string;
  owner: Address;
};

type nftData = {
  collectionId: number;
  nftAsset: Asset;
};

type orderData = {
  owner: Address;
  price: uint64;
  nft: Asset;
  status: uint64; // 0 false 1 true
};

// eslint-disable-next-line no-unused-vars
class AlgorandNftMarketplace extends Contract {
  collectionIndex = GlobalStateKey<uint64>();

  collection = BoxMap<uint64, collectionData>({});

  nft = GlobalStateKey<Asset>();

  nftIndex = GlobalStateKey<uint64>();

  nftDataMap = BoxMap<uint64, nftData>({ prefix: 'n' });

  orderIndex = GlobalStateKey<uint64>();

  order = BoxMap<uint64, orderData>({ prefix: 'o' });

  createCollection(name: string): void {
    const temp: collectionData = {
      name: name,
      owner: this.txn.sender,
    };

    this.collection(this.collectionIndex.value).value = temp;
    this.collectionIndex.value = this.collectionIndex.value + 1;
  }

  mintNFT(name: string, url: string): Asset {
    const nftTicket = sendAssetCreation({
      configAssetTotal: 1,
      configAssetName: name,
      configAssetURL: url,
    });
    return nftTicket;
  }

  mapNFTdata(nft: Asset, collectionId: uint64): void {
    const temp: nftData = {
      collectionId: collectionId,
      nftAsset: nft,
    };

    this.nftDataMap(this.nftIndex.value).value = temp;
    this.nftIndex.value = this.nftIndex.value + 1;
  }

  listingNFT(nft: Asset, price: number, axfer: AssetTransferTxn): void {
    // verfiy Txn
    verifyTxn(axfer, { assetReceiver: this.app.address });

    // create order
    const temp: orderData = {
      owner: this.txn.sender,
      price: price,
      nft: nft,
      status: 0,
    };

    this.order(this.orderIndex.value).value = temp;
    this.orderIndex.value = this.orderIndex.value + 1;
  }

  unListingNFT(orderId: number, nft: Asset): void {
    // verify owner
    assert(this.txn.sender === this.order(orderId).value.owner);

    // check Status of NFT
    assert(this.order(orderId).value.status === 1);

    this.order(orderId).value.status = 1;

    // Transfer NFT to owner
    sendAssetTransfer({
      xferAsset: nft,
      assetReceiver: this.txn.sender,
      assetAmount: 1,
    });
  }

  buyNFTFromMarketplace(orderId: number, payment: PayTxn, nft: Asset): void {
    // Check order status
    assert(this.order(orderId).value.status === 0);
    // Check enough money to buy
    verifyTxn(payment, {
      sender: this.txn.sender,
      amount: { greaterThan: this.order(orderId).value.price },
      receiver: this.order(orderId).value.owner,
    });

    // Transfer Asset
    sendAssetTransfer({
      xferAsset: nft,
      assetReceiver: this.txn.sender,
      assetAmount: 1,
    });
  }
}
