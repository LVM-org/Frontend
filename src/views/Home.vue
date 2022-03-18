<template>
  <div style="display: flex; align-content: center; justify-content: center">
    <div>
      <button @click="goToNextPrev()">Prev page</button>
      <button @click="goToNextPage()">Next page</button>
      <div id="pdf-wrapper"></div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.js";
import * as pdfViewer from "pdfjs-dist/web/pdf_viewer.js";
import "pdfjs-dist/web/pdf_viewer.css";
import "pdfjs-dist/";
import CryptoJS from "crypto-js";
import axios from "axios";
import { PDFDocument } from "pdf-lib";
import { PDFDocumentProxy } from "pdfjs-dist/";

export default defineComponent({
  setup() {
    type CipherParams = {
      ct: string;
      iv?: string;
      s?: string;
    };
    const JsonFormatter = {
      stringify: function (cipherParams: CryptoJS.lib.CipherParams) {
        // create json object with ciphertext
        const jsonObj: CipherParams = {
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
      parse: function (jsonStr: string) {
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

    const decryptData = (encryptedData: string, decoder: string) => {
      const encrypted = JsonFormatter.parse(encryptedData);
      const decrypted = CryptoJS.AES.decrypt(encrypted, decoder, {
        format: JsonFormatter,
      });

      return decrypted.toString(CryptoJS.enc.Utf8);
    };

    const fileContent = ref();

    const totalPages = ref(0);

    const newPdfData = ref();

    const mainpdfViewerContainer = ref();

    const mainPdfDocument = ref<PDFDocumentProxy>();

    axios
      .get("http://localhost:8080/52DcMvYD2sgXD14E4DhQdms4KyDZA2sKQXx5zosxuNNN.spf")
      .then((response) => {
        fileContent.value = response.data;
      });

    const pageNumber = ref(1);

    const createPDF = async (pdfString: string) => {
      const currentPdf = await PDFDocument.load(pdfString);
      const pdfBytes = await currentPdf.save();
      return pdfBytes;
    };

    const initiateSpdf = async () => {
      const decoderKey =
        fileContent.value.pubKey + "Gn5GkKQtjxuZgYBMQKxqDN3VRLyhab5Qt526wqgmRouK";

      const decoderData = decryptData(
        JSON.stringify(fileContent.value.decoder),
        decoderKey
      );

      const decordedMedia = `decryptData(
        JSON.stringify(fileContent.value.pages),
        ${decoderData}
      )`;

      const mediaDataString = eval(decordedMedia);

      totalPages.value = fileContent.value.metadata.pageCount;

      newPdfData.value = await createPDF(mediaDataString);

      loadDocument(newPdfData.value);
    };

    const loadDocument = (pdfData: Uint8Array) => {
      pdfjs.GlobalWorkerOptions.workerSrc =
        "//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.13.216/pdf.worker.js";

      // Some PDFs need external cmaps.
      //
      const CMAP_URL = "pdfjs-dist/cmaps/";
      const CMAP_PACKED = true;

      const ENABLE_XFA = true;

      // Loading document.
      const loadingTask = pdfjs.getDocument({
        data: pdfData,
        cMapUrl: CMAP_URL,
        cMapPacked: CMAP_PACKED,
        enableXfa: ENABLE_XFA,
      });

      (async () => {
        await loadingTask.promise.then(async (pdfDocument) => {
          const container = document.querySelector("#pdf-wrapper");

          const SCALE = 1.0;

          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          window.pdfMainDocument = pdfDocument;

          const eventBus = new pdfViewer.EventBus();

          // Document loaded, retrieving the page.
          const pdfPage = await pdfDocument.getPage(1);
          // Creating the page view with default parameters.
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          window.pdfViewerContainer = new pdfViewer.PDFPageView({
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            container,
            id: 1,
            scale: SCALE,
            defaultViewport: pdfPage.getViewport({ scale: SCALE }),
            eventBus,
            // We can enable text/annotation/xfa/struct-layers, as needed.
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            textLayerFactory: !pdfDocument.isPureXfa
              ? new pdfViewer.DefaultTextLayerFactory()
              : null,
            annotationLayerFactory: new pdfViewer.DefaultAnnotationLayerFactory(),
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            xfaLayerFactory: pdfDocument.isPureXfa
              ? new pdfViewer.DefaultXfaLayerFactory()
              : null,
            structTreeLayerFactory: new pdfViewer.DefaultStructTreeLayerFactory(),
          });

          // Associate the actual page with the view, and draw it.
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          window.pdfViewerContainer.setPdfPage(pdfPage);
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          return window.pdfViewerContainer.draw();
        });
      })();
    };

    const goToNextPage = () => {
      if (pageNumber.value == totalPages.value - 1) return;
      pageNumber.value++;
    };

    const goToNextPrev = () => {
      if (pageNumber.value == 1) return;
      pageNumber.value--;
    };

    watch(fileContent, async () => {
      await initiateSpdf();
    });

    watch(pageNumber, async () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const page = await window.pdfMainDocument.getPage(pageNumber.value);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.pdfViewerContainer.setPdfPage(page);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.pdfViewerContainer.draw();
    });

    return {
      goToNextPrev,
      goToNextPage,
    };
  },
});
</script>
<style scoped>
#pdf-wrapper {
  border: 1px solid black;
  position: relative;
}
</style>
