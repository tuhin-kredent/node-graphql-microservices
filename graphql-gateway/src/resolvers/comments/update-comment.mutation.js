import * as yup from 'yup'

import { isString } from 'lodash'

import authUtils from '../../utils/auth'

const updateComment = {
  validationSchema: yup.object().shape({
    id: yup.string().required('ID is a required field.'),
    data: yup.object().shape({
      text: yup
        .string()
        .trim()
        .min(5, 'Text should at least be 5 characters.')
        .max(500, 'Text should be 500 characters at most.')
    })
  }),
  beforeResolve: async (args, { request, commentService, logger }) => {
    const { id, data } = args

    const author = await authUtils.getUser(request)
    const comment = await commentService.findOne({ where: { id, author } })

    logger.info('CommentMutation#updateComment.target', comment)

    if (!comment) {
      throw new Error('Comment not found or you may not be the owner of the comment')
    }

    if (isString(data.text)) {
      comment.text = data.text
    }

    return { id, comment }
  },
  resolve: async (parent, {id, comment}, { commentService }) => {
    const updatedComment = await commentService.update(id, comment)

    return { updatedComment }
  },
  afterResolve: async( { updatedComment }, { pubsub } ) => {
    pubsub.publish(`comment#${updatedComment.post}`, {
      comment: {
        mutation: 'UPDATED',
        data: updatedComment
      }
    })

    return { comment: updatedComment }
  }
}

export default { updateComment }
