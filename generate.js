//. generate.js 
var fs = require( 'fs' );
var request = require( 'request' );

//. env values
var design_name = ( 'DESIGN_NAME' in process.env ? process.env.DESIGN_NAME : 'mydesign' );
var cloudant_url = ( 'CLOUDANT_URL' in process.env ? process.env.CLOUDANT_URL : '' );
while( cloudant_url.endsWith( '/' ) ){
  cloudant_url = substr( 0, cloudant_url.length - 1 );
}

if( cloudant_url ){
  var template_file = ( 'TEMPLATE_FILE' in process.env ? process.env.TEMPLATE_FILE : 'sample.json' );

  //. テンプレート内容を読み込む
  var template = fs.readFileSync( template_file, 'utf-8' );
  if( typeof template == 'string' ){
    template = JSON.parse( template );
  }

  if( template ){
    //. データインポート
    dataImport( template ).then( function( result0 ){
      //console.log( { result0 } );

      //. デザインドキュメント作成／更新
      createDesignDoc( template ).then( function( result ){
        console.log( { result } );
      });
    });
  }
}else{
  console.log( 'No CLOUDANT_URL parameter found.' );
}


var db_headers = { 'Accept': 'application/json' };

async function dataImport( template ){
  return new Promise( async function( resolve, reject ){
    if( template.data && template.data.length > 0 ){
      var option = {
        url: cloudant_url + '/_bulk_docs',
        method: 'POST',
        json: { docs: template.data },
        headers: db_headers
      };
      request( option, ( err, res, body ) => {
        if( err ){
          resolve( { status: false, error: err } );
        }else{
          resolve( { status: true, count: template.data.length, result: body } );
        }
      });
    }else{
      resolve( { status: true, count: 0 } );
    }
  });
}

async function createDesignDoc( template ){
  return new Promise( async function( resolve, reject ){
    var data = {
      language: "javascript"
    };
    var b = false;

    if( template.views && template.views.map ){
      //. ビュー作成
      b = true;
      data.views = {};
      data.views[design_name] = {
        map: template.views.map
      };
    }

    if( template.lists ){
      //. リスト作成
      b = true;
      data.lists = {};
      data.lists[design_name] = template.lists;
    }

    if( template.shows ){
      //. ショウ作成
      b = true;
      data.shows = {};
      data.shows[design_name] = template.shows;
    }

    if( b ){
      var id = "_design/" + design_name;
      //. 既存か新規か
      var option = {
        url: cloudant_url + '/' + id,
        method: 'GET',
        headers: db_headers
      };
      request( option, ( err, res, doc ) => {
        if( err ){
          //. 新規
          option = {
            url: cloudant_url + '/' + id,
            method: 'PUT',
            json: data,
            headers: db_headers
          };
          request( option, ( err, res, body ) => {
            if( err ){
              resolve( { status: false, error: err } );
            }else{
              resolve( { status: true, result: body } );
            }
          });
        }else{
          //. 既存 
          doc = JSON.parse( doc );
          var rev = '';
          if( doc && doc._rev ){
            rev = doc._rev;
          }
          option = {
            url: cloudant_url + '/' + id, // + '?rev=' + rev,
            method: 'PUT',
            json: data,
            headers: db_headers
          };
          if( rev ){
            option.url += '?rev=' + rev;
          }

          request( option, ( err, res, result ) => {
            if( err ){
              resolve( { status: false, error: err } );
            }else{
              resolve( { status: true, result: result } );
            }
          });
        }
      });
    }
  });
}

