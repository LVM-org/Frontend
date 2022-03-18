importScripts("https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js")


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


onmessage = function(data) {

	const mediaFileBuffer = new Uint8Array(data.data.file)
	const pageNumber = data.data.page;
	const metaDataToBuffer = new Uint8Array(data.data.metadata)
	const metadata = JSON.parse(new TextDecoder().decode(metaDataToBuffer))

	const mediaData = new TextDecoder().decode(mediaFileBuffer)
	getPage(mediaData, metadata, pageNumber ).then((data) => {
		postMessage(data);
	})
	
};

