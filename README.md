# Tasapainota Suomen eläkejärjestelmä

Interaktiivinen selainpohjainen simulaattori, jossa voi tutkia Suomen eläkejärjestelmän pitkän aikavälin kehitystä ja erilaisten parametrien vaikutuksia.

**Tavoite:** tehdä eläkejärjestelmän rahoituksesta, väestökehityksestä ja eri vaihtoehtojen välisistä kompromisseista helposti ymmärrettäviä.

> 🚧 Projekti on kehitysvaiheessa.

## Demo

**Live demo:** tulossa

## Mitä tällä voi tehdä?

Simulaattorissa käyttäjä voi muuttaa esimerkiksi:

* eläkeikää
* eläkemaksujen tasoa
* eläkkeiden karttumaa
* indeksisääntöä
* työllisyysastetta
* nettomaahanmuuttoa
* syntyvyyttä
* sijoitustuottoa

ja tarkastella muutosten vaikutuksia Suomen eläkejärjestelmään pitkällä aikavälillä.

Simulaattorissa tarkasteltavia mittareita ovat esimerkiksi:

* eläkemeno suhteessa BKT:hen
* eläkemaksujen taso
* eläkevarojen kehitys
* eläketaso suhteessa palkkoihin
* eläkeläisten ja työntekijöiden välinen suhde

## Mikä tämä ei ole?

Tämä ei ole virallinen eläke-ennuste eikä aktuaarinen laskentamalli.

Simulaattori on tarkoitettu havainnollistamiseen ja eri oletusten välisten vaikutussuhteiden tutkimiseen. Sen laskentamalli on tarkoituksella huomattavasti yksinkertaisempi kuin viranomaisten ja eläkelaitosten käyttämät yksityiskohtaiset mallit.

Tuloksia ei tule käyttää henkilökohtaisten eläke- tai talouspäätösten perustana.

## Data

Projektissa käytetään julkisesti saatavilla olevaa suomalaista tilasto- ja ennustedataa.

Ensisijaisia lähteitä ovat esimerkiksi:

* Eläketurvakeskus (ETK)
* Tilastokeskus
* muut suomalaiset viranomais- ja tilastolähteet

Kunkin aineiston lähde, ajankohta, lisenssi ja mahdolliset muunnokset dokumentoidaan `data/`-hakemistossa ja lähdetiedoissa.

Projektin oma koodi ja muiden osapuolten tuottama data eivät välttämättä kuulu saman lisenssin piiriin.

## Menetelmä

Simulaattorin laskenta perustuu yksinkertaistettuun malliin, jossa yhdistyvät esimerkiksi:

```text
väestö
  ↓
työikäinen väestö
  ↓
työllisyys
  ↓
palkkasumma
  ↓
eläkemaksut
  ↓
eläkemeno
  ↓
eläkevarat
```

Mallin yksityiskohtainen määrittely löytyy tiedostosta:

`SPEC.md`

## Teknologia

Projektin tavoitteena on pitää toteutus mahdollisimman kevyenä ja helposti upotettavana.

* HTML
* CSS
* JavaScript
* JSON
* Chart.js
* GitHub Pages

Erillistä palvelinta ei lähtökohtaisesti tarvita.

## Upottaminen

Simulaattori on tarkoitus voida upottaa muille verkkosivuille esimerkiksi iframe-elementillä:

```html
<iframe
  src="https://YOUR-USERNAME.github.io/tasapainota-elakejarjestelma/"
  width="100%"
  height="800"
  style="border: 0;"
  loading="lazy">
</iframe>
```

Upotuksen tarkempi toteutus dokumentoidaan projektin edetessä.

## Kehityksen periaatteet

Projektissa pyritään:

* käyttämään mahdollisimman paljon alkuperäisiä julkisia lähteitä
* näyttämään datan lähteet käyttäjälle
* erottamaan havaittu data, ennusteet ja simulaattorin omat laskelmat
* tekemään laskentamallista mahdollisimman läpinäkyvä
* välttämään piilotettuja oletuksia
* tekemään eri skenaarioiden vaikutukset näkyviksi ilman, että simulaattori määrittelee yhtä "oikeaa" ratkaisua

## Projektin rakenne

Suunniteltu rakenne:

```text
.
├── index.html
├── style.css
├── app.js
├── SPEC.md
├── README.md
├── LICENSE
│
├── data/
│   ├── current.json
│   ├── historical.json
│   └── projections.json
│
├── src/
│   ├── model.js
│   ├── simulation.js
│   ├── charts.js
│   └── ui.js
│
├── scripts/
│   └── update-data.js
│
└── .github/
    └── workflows/
        └── update-data.yml
```

## Osallistuminen

Projektin kehitykseen voi osallistua esimerkiksi:

* ehdottamalla uusia parametreja
* korjaamalla laskentamallia
* parantamalla käyttöliittymää
* lisäämällä dokumentoitua dataa
* raportoimalla virheitä
* ehdottamalla uusia visualisointeja

Pull requestit ja issuet ovat tervetulleita.

## Lisenssi

Projektin lähdekoodi on julkaistu **MIT License** -lisenssillä.

Katso `LICENSE`.

Projektissa käytettävän ulkopuolisen datan ja muiden aineistojen lisenssit määräytyvät niiden alkuperäisten ehtojen mukaisesti. Katso `DATA-LICENSES.md`.

## Vastuuvapauslauseke

Simulaattori on avoimen lähdekoodin havainnollistamistyökalu.

Se ei ole viranomaisen julkaisema ennuste, virallinen talousmalli, aktuaarinen laskelma eikä henkilökohtainen eläke- tai sijoitusneuvonta.

Laskelmien tulokset riippuvat käytetyistä oletuksista ja yksinkertaistuksista.
