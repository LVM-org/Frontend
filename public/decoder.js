importScripts("https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js")
importScripts("https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js")

const JsonFormatter = {
	stringify: function (cipherParams) {
	  // create json object with ciphertext
	  const jsonObj = {
		ct: cipherParams.ciphertext.toString(CryptoJS.enc.Base64),
	  };
	  // optionally add iv or salt
	  if (cipherParams.iv) {
		jsonObj.iv = cipherParams.iv.toString();
	  }
	  if (cipherParams.salt) {
		jsonObj.s = cipherParams.salt.toString();
	  }
	  // stringify json object
	  return JSON.stringify(jsonObj);
	},
	parse: function (jsonStr){
	  // parse json string
	  const jsonObj = JSON.parse(jsonStr);
	  // extract ciphertext from json object, and create cipher params object
	  const cipherParams = CryptoJS.lib.CipherParams.create({
		ciphertext: CryptoJS.enc.Base64.parse(jsonObj.ct),
	  });
	  // optionally extract iv or salt
	  if (jsonObj.iv) {
		cipherParams.iv = CryptoJS.enc.Hex.parse(jsonObj.iv);
	  }
	  if (jsonObj.s) {
		cipherParams.salt = CryptoJS.enc.Hex.parse(jsonObj.s);
	  }
	  return cipherParams;
	},
};


const getPage = async (pdfString, metadata, page) => {
	const currentPdf = await PDFLib.PDFDocument.load(pdfString);
	const newPdf = await PDFLib.PDFDocument.create();
	newPdf.setTitle(metadata.title || '');
	newPdf.setAuthor(metadata.author || '');
	newPdf.setSubject(metadata.subject || '');
	newPdf.setKeywords(metadata.keywords.split(","));
	newPdf.setProducer(metadata.producer);
	newPdf.setCreator(metadata.creator);
	newPdf.setCreationDate(new Date(metadata.creationDate));
	newPdf.setModificationDate(
	  new Date(metadata.modificationDate)
	);
	const copiedPages = await newPdf.copyPages(currentPdf, [page]);
	newPdf.addPage(copiedPages[0]);
	const pdfBytes = await newPdf.save();
	return pdfBytes;
}


const decryptData = (encryptedData) => {
	const encrypted = JsonFormatter.parse(encryptedData);
	const decrypted = CryptoJS.AES.decrypt(encrypted, "hello world", {
	  format: JsonFormatter,
	});
	return decrypted.toString(CryptoJS.enc.Utf8);
};



onmessage = function(data) {

	const stringBuffer = new Uint8Array(data.data.file)
	const pageNumber = data.data.page;
	const metaDataToBuffer = new Uint8Array(data.data.metadata)
	const metadata = JSON.parse(new TextDecoder().decode(metaDataToBuffer))
	const stringifiedJson = new TextDecoder().decode(stringBuffer)
	getPage(decryptData(stringifiedJson), metadata, pageNumber ).then((data) => {
		postMessage(data);
	})
	
};


