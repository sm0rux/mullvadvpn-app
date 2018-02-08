import { createViewStyles, createTextStyles } from '../lib/styles';
import { colors } from '../config';

export default Object.assign(createViewStyles({
  support:{
    backgroundColor: colors.darkBlue,
    height: '100%',
  },
  support__container:{
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    paddingBottom: 24,
  },
  support__header:{
    flex: 0,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 24,
    paddingRight: 24,
  },
  support__close:{
    paddingLeft: 12,
    paddingTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginLeft: 12,
  },
  support__close_icon:{
    width: 24,
    height: 24,
    flex: 0,
    opacity: 0.6,
    marginRight: 8,
  },
  support__content:{
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  support__form:{
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
  },
  support__form_row:{
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 24,
    paddingRight: 24,
  },
  support__form_row_message:{
    flex: 1,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 24,
    paddingRight: 24,
    marginTop: 8,
  },
  support__form_message_scroll_wrap:{
    flex: 1,
    display: 'flex',
    borderRadius: 4,
    overflow: 'hidden',
  },
  support__footer:{
    paddingTop: 1,
    paddingRight: 24,
    paddingLeft: 24,
    paddingBottom: 24,
    marginTop: 12,
    display: 'flex',
    flexDirection: 'column',
    flex: 0,
  },
  support__form_view_logs:{
    backgroundColor: colors.blue,
    color: colors.white80,
  },
  support__form_edit_logs:{
    backgroundColor: colors.blue,
    color: colors.white80,
  },
  support__form_send:{
    backgroundColor: 'rgba(63,173,77,0.8)',
    marginTop: 16,
  },
  support__form_send_hover:{
    backgroundColor: colors.green,
  },
  support__status_icon:{
    textAlign: 'center',
    marginBottom: 32,
  },
  support__open_icon:{
    color: colors.white80,
    marginLeft: 8,
    width: 16,
    height: 16,
  },
}), createTextStyles({
  support__close_title:{
    fontFamily: 'Open Sans',
    fontSize: 13,
    fontWeight: '600',
    color: colors.white60,
  },
  support__title:{
    fontFamily: 'DINPro',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 40,
    color: colors.white,
    marginBottom: 16,
  },
  support__subtitle:{
    fontFamily: 'Open Sans',
    fontSize: 13,
    fontWeight: '600',
    overflow: 'visible',
    color: colors.white80,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  support__form_email:{
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    paddingTop: 10,
    paddingLeft: 12,
    paddingRight: 12,
    paddingBottom: 12,
    fontFamily: 'Open Sans',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 26,
    color: colors.blue,
    backgroundColor: colors.white,
  },
  support__form_message:{
    paddingTop: 10,
    paddingLeft: 12,
    paddingRight: 12,
    paddingBottom: 10,
    fontFamily: 'Open Sans',
    fontSize: 13,
    fontWeight: '600',
    color: colors.blue,
    backgroundColor: colors.white,
    flex: 1,
  },
  support__sent_email:{
    fontWeight: '900',
    color: colors.white,
  },
  support__status_security__secure:{
    fontFamily: 'Open Sans',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 4,
    color: colors.green,
  },
  support__send_status:{
    fontFamily: 'DINPro',
    fontSize: 38,
    fontWeight: '900',
    maxHeight: 'calc(1.16em * 2)',
    overflow: 'visible',
    letterSpacing: -0.9,
    color: colors.white,
    marginBottom: 4,
  },
  support__no_email_warning: {
    fontFamily: 'Open Sans',
    fontSize: 13,
    lineHeight: 16,
    color: colors.white80,
  },
}));
