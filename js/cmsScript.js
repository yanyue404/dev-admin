// ==UserScript==
// @name         cms-plugin
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        */cms/index
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  $(function () {
    const $CMS_IFRAME = $('.CMS_iframe');
    const CMS_IFRAME = $CMS_IFRAME[0];
    let CMS_IFRAME_BODY = null;
    //Ueditor对象
    let UE = null;
    if(!CMS_IFRAME) return;
    //主iframe加载事件
    CMS_IFRAME.onload = function () {
      console.log('iframeLoad');
      CMS_IFRAME_BODY = $CMS_IFRAME.contents().find('body');
      //匹配到新增/编辑产品界面
      if (/toProductCreatePage/.test(CMS_IFRAME.src)) {
        setTimeout(() => {
          //UE对象
          UE = CMS_IFRAME.contentWindow.UE;
          //追加样式文本
          initStyle();
          //注册富文本编辑器按钮
          const modal_widget = initModal();
          modal_widget.iframe.onload = function(){
            setTimeout(() => {
              //告知处于CMS环境
              modal_widget.iframe.contentWindow.postMessage({
                method: 'inCms'
              }, '*')
            })
          }
          //监听Message
          CMS_IFRAME.contentWindow.addEventListener('message', function(e){
            const {data: {method, data, timestamp}} = e;
            switch(method){
              case 'loaded': {
                //初始化工具按钮
                const btn_widget = initToolBtn();
                btn_widget.on('click', function(){
                  let content = UE.getEditor('editor').getContent();
                  try{
                    content = JSON.parse(content.replace(/\&quot;/g, '"'));
                  }catch(err){
                    content = ''
                  }
                  //传递初值
                  modal_widget.iframe.contentWindow.postMessage({
                    method: 'initRateConfig',
                    data: content
                  }, '*')
                  modal_widget.show();
                });
                break;
              }
              case 'rateConfigDone': {
                modal_widget.hide();
                UE.getEditor('editor').setContent(data);
                console.log('同步配置完成');
                break;
              }
            }
          })
        }, 0)
      }
    }
    //初始化模态框
    function initModal(){
      const _modal = $(`
        <div class="modal fade" style="overflow-y:auto;" id="modal-widget" tabindex="0" role="dialog" aria-labelledby="div_modalLabel" aria-hidden="true"  data-backdrop="false">
          <div class="modal-dialog" style="width: 90%">
              <div class="modal-content" style="width: 100%;">
                  <div class="modal-header">
                      <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
                      <h4 class="modal-title"  style="color:rgba(51,57,57,1);">配置费率表</h4>
                  </div>
                  <div class="modal-body">
                    <iframe id='iframe-widget' src='//ecuat.tk.cn/tkproperty/prd/tk-widget' frameborder='0' style='width: 100%; min-height: 800px;'></iframe>
                  </div>
              </div>
          </div>
        </div>
      `);
      const iframe = _modal.find('#iframe-widget')[0];
      const _modal_wrapper = $((`<div class="tk-widget-wrapper modal-backdrop fade in"></div>`));
      CMS_IFRAME_BODY.append(_modal);
      _modal.on('show.bs.modal', function(){
        CMS_IFRAME_BODY.append(_modal_wrapper);
      }).on('hidden.bs.modal', function(){
        _modal_wrapper.remove();
      })
      return {
        iframe,
        show(){
          _modal.modal('show');
        },
        hide(){
          _modal.modal('hide');
        }
      }
    }
    //初始化工具条按钮
    function initToolBtn(){
      const toolbar = $(UE.getEditor('editor').container).contents().find('.edui-toolbar');
      const btn_widget = $(`
      <div id="btn-modal-widget" class="edui-box edui-button edui-for-widget edui-default">
        <div id="btn-widget_state" class="edui-default">
          <div class="edui-button-wrap edui-default">
            <div id="btn-widget_body" unselectable="on" title="产品小助手" class="edui-button-body edui-default">
              <div class="edui-box edui-icon edui-default"></div>
              <div class="edui-box edui-label edui-default"></div>
            </div>
          </div>
        </div>
      </div>
      `);
      toolbar.append(btn_widget);
      return btn_widget;
    }

    //追加样式文本
    function initStyle(){
      var style = document.createElement('style');
      style.type = 'text/css';
      var text = document.createTextNode(`
        .edui-for-widget .edui-icon{
          background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAC/UlEQVRYR+WVS2gTURSGvzP1QUHEhaIiVorgQjGI6EKkzYSgIoIg+Fr46Eyw1SgYdalgBN0qIi4kzbRaNxbciQvF9qa6FUHBjRulOx87BbE6R26aqbUmTdKm7cK7mrn3zPm/e+a/5wpzPGSO9fn/AJKBrn/my9uo8rNUARU3TxqHU+4HYtmshLMCEM9rQoQ0sL8oKDw0now+l0bDK5DM6fKfTaQFTgHLROgj5JEKD4BrxpdLMwLgBnqIUdF4JGB8kXigeQG/NHfU+HK/YQDtPbrRgbQqnQJOlDhUdjnDDNDCe2DVWLkdtgx2yMtpARzo16aP30iL0gVs+CuZ0DfoyTG3RzehvJrQYz4tmEfrk2PybUoAiV5NEtKlcKBs8xJajSfv44F6AsHEGIXHBV/2TJyf1IRtfbrSGeGkQCewoqyw4pmU9G7r1+aFX+kBrBf+GapcL6TkQk0AbrceRuhESFRq1dbdttx2Pd6jW0V5AiypFG99UkhJriJA8q7GfoV0osXdzq+UqDj/i4Q5IcY+tner7zjkJ423i0qbScmLigBuoEcYLXVbxWTKFZOSrF3ffV8Xf/9BVuFcVXEbMMIy0yWfq/6CeKDnBM4Ca8YFGwTPmszOJbp1uzpcBnbUJA7DxpeWcrEVTegGehG4Sslk0cduoPb43ar6m8apqdJfSElZc9bcit07upT5xV2fqXHXf8KEjPHkZl0VGB/s5tSlqSju1i1u/SfsLHjydMoA0YeJvO5FuKywuR6QEFqGfBmeFkBbTmPPT8hrm6R0YuxpWFsLiL2UKsXV7oFAVeFewZfjY4bM62lbEXvtTgLyzviyriEAURKF8wVfbhSrcVsX0UwGsPf8wjJCd40vHQ0FKCX7EsLBIV8G7Ht7oKtFyYhwfoLYSePLnZkAsO11rDNGAsmcxsImMgqenQuF2JAnbxoPUEZ8vEgi0LgqGZOSfZMZtS4TjiWqIl7LyYhi6gdooLiFqA+gweL1AeQ1G13F9ZS4WmzNFaiWaKrrcw7wG6CBCjC3H/nDAAAAAElFTkSuQmCC) !important;
          background-repeat: no-repeat !important;
          background-size: 100% 100% !important;
        }
        .edui-for-widget #btn-widget_body{
          width: 22px;
          height: 22px;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .edui-for-widget #btn-widget_body:hover{
          transform: scale(1.2);
        }
      `)
      style.append(text);
      $CMS_IFRAME.contents().find('head').append(style);
    }
  })
  // Your code here...
})();