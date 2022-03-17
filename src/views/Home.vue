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
import { PDFDocument } from "pdf-lib";
import axios from "axios";

export default defineComponent({
  setup() {
    const fileContent = ref();

    const currentPage = ref<Uint8Array>();

    const totalPages = ref(0);

    axios.get("http://localhost:8080/first_book.spdf").then((response) => {
      fileContent.value = response.data;
    });

    const decoder = new Worker("decoder.js");

    decoder.addEventListener(
      "message",
      function (e) {
        currentPage.value = e.data;
      },
      false
    );

    const pageNumber = ref(0);

    const initiateSpdf = async () => {
      const SpdfData = new TextEncoder().encode(JSON.stringify(fileContent.value.pages));

      const pdfMetaData = new TextEncoder().encode(
        JSON.stringify(fileContent.value.metadata)
      );

      totalPages.value = fileContent.value.metadata.pageCount;

      decoder.postMessage(
        { file: SpdfData.buffer, metadata: pdfMetaData.buffer, page: pageNumber.value },
        [SpdfData.buffer, pdfMetaData.buffer]
      );
    };

    const loadPage = async () => {
      if (currentPage.value) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        loadDocument(currentPage.value);
      } else {
        initiateSpdf();
      }
    };

    const loadDocument = (pdfData: Uint8Array) => {
      pdfjs.GlobalWorkerOptions.workerSrc =
        "//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.13.216/pdf.worker.js";

      // Some PDFs need external cmaps.
      //
      const CMAP_URL = "pdfjs-dist/cmaps/";
      const CMAP_PACKED = true;

      const PAGE_TO_VIEW = 1;
      const SCALE = 1.0;

      const ENABLE_XFA = true;

      if (document.querySelector("#pdf-wrapper") != null) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        document.querySelector("#pdf-wrapper").innerHTML = "";
      }

      const container = document.querySelector("#pdf-wrapper");

      const eventBus = new pdfViewer.EventBus();

      // Loading document.
      const loadingTask = pdfjs.getDocument({
        data: pdfData,
        cMapUrl: CMAP_URL,
        cMapPacked: CMAP_PACKED,
        enableXfa: ENABLE_XFA,
      });

      (async function () {
        const pdfDocument = await loadingTask.promise;

        // Document loaded, retrieving the page.
        const pdfPage = await pdfDocument.getPage(PAGE_TO_VIEW);
        // Creating the page view with default parameters.
        const pdfPageView = new pdfViewer.PDFPageView({
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          container,
          id: PAGE_TO_VIEW,
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
        pdfPageView.setPdfPage(pdfPage);
        return pdfPageView.draw();
      })();
    };

    const goToNextPage = () => {
      if (pageNumber.value == totalPages.value - 1) return;
      pageNumber.value++;
    };

    const goToNextPrev = () => {
      if (pageNumber.value == 0) return;
      pageNumber.value--;
    };

    watch(fileContent, async () => {
      await initiateSpdf();
    });

    watch(currentPage, async () => {
      await loadPage();
    });

    watch(pageNumber, async () => {
      currentPage.value = undefined;
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
