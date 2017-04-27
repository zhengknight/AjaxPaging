using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using AjaxHandler;

namespace Paging.ajax
{
    /// <summary>
    /// PagingHandler 的摘要说明
    /// </summary>
    public class PagingHandler : WebAjaxHandler
    {
        public object Paging(Pagination pagination)
        {
            //分页为测试数据 数据库分页自行实现
            var list = new List<Model>();
            for (int i = 0; i < 100; i++)
            {
                list.Add(new Model { Id = i, Name = "name" + i, Age = i, Address = "address" + i, Mobile = "1355115457", Height = i, Weight = i, Remark ="格斯达克沙地上多空双方的伤口附近的客服电话开机"});
            }
            var startRow = (pagination.PageIndex - 1) * pagination.PageSize;
            var endRow = pagination.PageIndex * pagination.PageSize;
            pagination.RowCount = list.Count;
            return new
            {
                Data = list.Take(endRow).Skip(startRow),
                Pagination = pagination
            };
        }
    }
    /// <summary>
    /// 测试实体类
    /// </summary>
    public class Model
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int Age { get; set; }
        public string Address { get; set; }
        public string Mobile { get; set; }
        public int Height { get; set; }
        public int Weight { get; set; }
        public string Remark { get; set; }
    }

    /// <summary>
    /// 分页操作类
    /// </summary>
    public class Pagination
    {
        public Pagination()
        {

        }

        public Pagination(int pageSize, int pageIndex, bool getRowCount)
        {
            if (pageSize > 0)
            {
                _pagSize = pageSize;
            }
            if (pageIndex > 0)
            {
                _pageIndex = pageIndex;
            }
            _mGetRowCount = getRowCount;
        }
        private readonly int _pagSize = 10;
        private int _pageIndex = 1;
        private int _rowCount;
        private readonly bool _mGetRowCount = true;

        public int PageSize
        {
            get
            {
                return _pagSize;
            }
        }

        public int PageIndex
        {
            get
            {
                return _pageIndex;
            }
            set
            {
                _pageIndex = value;
            }
        }

        public int RowCount
        {
            get
            {
                return _rowCount;
            }
            set
            {
                if (value >= 0)
                {
                    _rowCount = value;
                }
            }
        }

        public int PageCount
        {
            get
            {
                return (_rowCount + _pagSize - 1) / _pagSize;
            }
        }

        public bool GetRowCount
        {
            get
            {
                return _mGetRowCount;
            }
        }

        public static Pagination Default
        {
            get
            {
                return new Pagination(1, 10, true);
            }
        }
    }
}